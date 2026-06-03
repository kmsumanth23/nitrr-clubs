-- =============================================================================
-- 09b_review_phases.sql
-- Three-phase application model: open → review → result.
-- =============================================================================

-- 1) clubs: result_date + publish audit columns
alter table clubs
  add column if not exists result_date timestamptz,
  add column if not exists results_published_at timestamptz,
  add column if not exists results_published_by uuid references profiles(id);

-- 2) applications: note authorship
alter table applications
  add column if not exists note_by uuid references profiles(id),
  add column if not exists note_at timestamptz;

-- 3) 'removed' value in application_status enum (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_enum
      where enumtypid = 'application_status'::regtype
        and enumlabel = 'removed'
  ) then
    alter type application_status add value 'removed';
  end if;
end$$;

-- 4) club_phase() — 'open' | 'review' | 'result'
create or replace function club_phase(club_id_in uuid)
returns text
language sql
stable
as $$
  select case
    when c.results_published_at is not null then 'result'
    when c.recruitment_deadline is null or now() < c.recruitment_deadline then 'open'
    else 'review'
  end
  from clubs c
  where c.id = club_id_in;
$$;
grant execute on function club_phase(uuid) to authenticated, anon;

-- 5) Phase-aware application trigger (replaces deadline-only trigger).
create or replace function enforce_application_phase()
returns trigger
language plpgsql
as $$
declare
  phase text;
  is_super boolean;
  is_admin boolean;
begin
  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  if coalesce(is_super, false) then
    return coalesce(new, old);
  end if;

  select club_phase(coalesce(new.club_id, old.club_id)) into phase;
  select can_manage_applications(coalesce(new.club_id, old.club_id)) into is_admin;

  if tg_op = 'INSERT' then
    if phase <> 'open' then
      raise exception 'Applications are closed for this club.'
        using errcode = '22023';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if phase <> 'open' then
      raise exception 'You can only delete your application while the club is open.'
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

drop trigger if exists trg_block_application_after_deadline on applications;
drop trigger if exists trg_enforce_application_phase on applications;
create trigger trg_enforce_application_phase
  before insert or update or delete on applications
  for each row execute function enforce_application_phase();

-- 6) publish_club_results(uuid) — lead-only (or super_admin). Gated on no
--    pending/reviewing apps remaining. Materializes accepted apps as members.
create or replace function publish_club_results(club_id_in uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
  is_lead  boolean;
  pending_count int;
  phase text;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
     where club_id = club_id_in
       and profile_id = auth.uid()
       and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can publish results.' using errcode = '42501';
  end if;

  select club_phase(club_id_in) into phase;
  if phase = 'result' then
    raise exception 'Results have already been published.' using errcode = '22023';
  end if;
  if phase = 'open' then
    raise exception 'Cannot publish before the recruitment deadline.'
      using errcode = '22023';
  end if;

  select count(*) into pending_count
    from applications
   where club_id = club_id_in
     and status in ('pending', 'reviewing');
  if pending_count > 0 then
    raise exception 'There are still % undecided applications.', pending_count
      using errcode = '22023';
  end if;

  update clubs
     set results_published_at = now(),
         results_published_by = auth.uid()
   where id = club_id_in;

  insert into club_members (club_id, profile_id)
  select club_id, profile_id
    from applications
   where club_id = club_id_in
     and status = 'accepted'
  on conflict (club_id, profile_id) do nothing;
end;
$$;

grant execute on function publish_club_results(uuid) to authenticated;
