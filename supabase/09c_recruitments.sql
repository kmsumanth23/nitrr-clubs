-- =============================================================================
-- 09c_recruitments.sql
-- Move recruitment data off clubs into a dedicated `recruitments` table.
-- =============================================================================

-- IMPORTANT: disable the application-phase trigger for the duration of the
-- data migration. We're updating applications.recruitment_id while the
-- existing trigger reads result/review phase from clubs — and that conflict
-- causes spurious "Results have been published" errors during the
-- migration. We re-enable + replace the trigger at the end.
alter table applications disable trigger trg_enforce_application_phase;

-- 1) Create the recruitments table
create table if not exists recruitments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text,
  deadline timestamptz,
  result_date timestamptz,
  results_published_at timestamptz,
  results_published_by uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists recruitments_club_id_idx on recruitments(club_id);
create index if not exists recruitments_created_at_idx
  on recruitments(club_id, created_at desc);

alter table recruitments enable row level security;

drop policy if exists "recruitments: public read" on recruitments;
create policy "recruitments: public read" on recruitments
  for select using (true);

drop policy if exists "recruitments: manager+ insert" on recruitments;
create policy "recruitments: manager+ insert" on recruitments
  for insert with check (
    is_super_admin() or can_manage_applications(club_id)
  );

drop policy if exists "recruitments: manager+ update" on recruitments;
create policy "recruitments: manager+ update" on recruitments
  for update using (
    is_super_admin() or can_manage_applications(club_id)
  );

grant select on recruitments to anon, authenticated;
grant insert, update, delete on recruitments to authenticated;

-- 2) Backfill one recruitment per club from current clubs columns
insert into recruitments (
  club_id, name, deadline, result_date,
  results_published_at, results_published_by, created_at
)
select
  c.id,
  'Initial recruitment',
  c.recruitment_deadline,
  c.result_date,
  c.results_published_at,
  c.results_published_by,
  coalesce(c.results_published_at, c.recruitment_deadline, now())
from clubs c
where not exists (
  select 1 from recruitments r where r.club_id = c.id
);

-- 3) Add recruitment_id to applications, backfill
alter table applications
  add column if not exists recruitment_id uuid references recruitments(id) on delete cascade;

update applications a
   set recruitment_id = r.id
  from recruitments r
 where a.club_id = r.club_id
   and a.recruitment_id is null;

-- Safety net for any leftover NULLs (shouldn't happen)
do $$
declare
  rec record;
  new_recruitment_id uuid;
begin
  for rec in select distinct club_id from applications where recruitment_id is null loop
    insert into recruitments (club_id, name, created_at)
      values (rec.club_id, 'Legacy recruitment', now())
      returning id into new_recruitment_id;
    update applications set recruitment_id = new_recruitment_id
      where club_id = rec.club_id and recruitment_id is null;
  end loop;
end $$;

alter table applications alter column recruitment_id set not null;

-- 4) Swap unique constraint: (club_id, profile_id) → (recruitment_id, profile_id)
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'applications_club_id_profile_id_key'
  ) then
    alter table applications drop constraint applications_club_id_profile_id_key;
  end if;
end $$;

alter table applications
  drop constraint if exists applications_recruitment_profile_unique;
alter table applications
  add constraint applications_recruitment_profile_unique
    unique (recruitment_id, profile_id);

-- 5) Drop the now-redundant recruitment columns from clubs
alter table clubs
  drop column if exists recruitment_deadline,
  drop column if exists result_date,
  drop column if exists results_published_at,
  drop column if exists results_published_by;

-- 6) Replace club_phase() with recruitment_phase()
drop function if exists club_phase(uuid);

create or replace function recruitment_phase(recruitment_id_in uuid)
returns text language sql stable as $$
  select case
    when r.results_published_at is not null then 'result'
    when r.deadline is null or now() < r.deadline then 'open'
    else 'review'
  end
  from recruitments r where r.id = recruitment_id_in;
$$;
grant execute on function recruitment_phase(uuid) to authenticated, anon;

-- 7) Helper: current (latest) recruitment for a club
create or replace function current_recruitment_for_club(club_id_in uuid)
returns uuid language sql stable as $$
  select id from recruitments
   where club_id = club_id_in
   order by created_at desc limit 1;
$$;
grant execute on function current_recruitment_for_club(uuid) to authenticated, anon;

-- 8) Replace the application-phase enforcement trigger to use recruitments
create or replace function enforce_application_phase()
returns trigger language plpgsql as $$
declare
  phase text;
  is_super boolean;
  is_admin boolean;
  rec_id uuid;
  rec_club_id uuid;
begin
  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  if coalesce(is_super, false) then return coalesce(new, old); end if;

  rec_id := coalesce(new.recruitment_id, old.recruitment_id);
  select club_id into rec_club_id from recruitments where id = rec_id;
  select recruitment_phase(rec_id) into phase;
  select can_manage_applications(rec_club_id) into is_admin;

  if tg_op = 'INSERT' then
    if phase <> 'open' then
      raise exception 'Applications are closed for this recruitment.'
        using errcode = '22023';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if phase <> 'open' then
      raise exception 'You can only delete your application while the recruitment is open.'
        using errcode = '22023';
    end if;
    return old;
  end if;

  -- UPDATE
  if phase = 'result' then
    raise exception 'Results have been published. This application is locked.'
      using errcode = '22023';
  end if;

  if phase = 'open' then
    if new.status not in ('pending', 'withdrawn') then
      raise exception 'Decisions can only be made after the deadline.'
        using errcode = '22023';
    end if;
    return new;
  end if;

  if phase = 'review' then
    if not coalesce(is_admin, false) then
      raise exception 'Your application is under review and cannot be edited.'
        using errcode = '22023';
    end if;
    if new.status = 'withdrawn' then
      raise exception 'Withdrawn is a student-only state.'
        using errcode = '22023';
    end if;
    return new;
  end if;

  return new;
end;
$$;

-- 9) Replace publish_club_results with publish_recruitment_results
drop function if exists publish_club_results(uuid);

create or replace function publish_recruitment_results(recruitment_id_in uuid)
returns void language plpgsql security definer
set search_path = public as $$
declare
  is_super boolean; is_lead boolean;
  pending_count int; phase text;
  the_club_id uuid;
begin
  select club_id into the_club_id from recruitments where id = recruitment_id_in;
  if the_club_id is null then
    raise exception 'Recruitment not found.' using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
     where club_id = the_club_id and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can publish results.' using errcode = '42501';
  end if;

  select recruitment_phase(recruitment_id_in) into phase;
  if phase = 'result' then
    raise exception 'Results have already been published.' using errcode = '22023';
  end if;
  if phase = 'open' then
    raise exception 'Cannot publish before the deadline.' using errcode = '22023';
  end if;

  select count(*) into pending_count
    from applications
   where recruitment_id = recruitment_id_in
     and status in ('pending', 'reviewing');
  if pending_count > 0 then
    raise exception 'There are still % undecided applications.', pending_count
      using errcode = '22023';
  end if;

  update recruitments
     set results_published_at = now(),
         results_published_by = auth.uid()
   where id = recruitment_id_in;

  insert into club_members (club_id, profile_id)
  select the_club_id, profile_id
    from applications
   where recruitment_id = recruitment_id_in and status = 'accepted'
  on conflict (club_id, profile_id) do nothing;
end;
$$;

grant execute on function publish_recruitment_results(uuid) to authenticated;

-- IMPORTANT: re-enable the trigger now that the migration is complete and
-- the trigger function has been replaced to use the new schema.
alter table applications enable trigger trg_enforce_application_phase;
