-- =========================================================================
-- 16A — Drive schema + backfill
-- =========================================================================
-- Adds drive-level target years, description, published_at (for draft support),
-- and a drive_questions table. Backfills existing recruitments as published
-- with the 3 default questions.
--
-- Runs cleanly on top of the current schema. No trigger disables needed.
-- Idempotent-safe with IF NOT EXISTS guards where practical.
-- =========================================================================

-- ---- 1) drive_questions table --------------------------------------------

create table if not exists drive_questions (
  id uuid primary key default gen_random_uuid(),
  recruitment_id uuid not null references recruitments(id) on delete cascade,
  prompt text not null,
  question_type text not null default 'long_text'
    check (question_type in ('short_text', 'long_text')),
  sort_order int not null default 0,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_drive_questions_recruitment
  on drive_questions(recruitment_id, sort_order);

-- RLS: public read (so students can see the form), sysadmin/club admins write via RPCs
alter table drive_questions enable row level security;

drop policy if exists "drive_questions read all" on drive_questions;
create policy "drive_questions read all"
  on drive_questions for select
  using (true);

-- No direct insert/update/delete policies — all writes go through
-- SECURITY DEFINER RPCs which enforce authority.
grant select on drive_questions to anon, authenticated;
grant insert, update, delete on drive_questions to authenticated;
-- (RLS blocks direct writes; RPCs bypass via security definer)

-- ---- 2) recruitments new columns -----------------------------------------

alter table recruitments
  add column if not exists target_years int[] not null default '{1,2,3,4}',
  add column if not exists published_at timestamptz null,
  add column if not exists description text null;

-- Constraint: target_years must be non-empty subset of {1,2,3,4}
alter table recruitments
  drop constraint if exists check_target_years_valid;
alter table recruitments
  add constraint check_target_years_valid check (
    array_length(target_years, 1) between 1 and 4
    and target_years <@ array[1,2,3,4]
    and array_length(target_years, 1) = cardinality(target_years)
  );

-- ---- 3) Backfill: mark existing recruitments as published ----------------
-- Existing recruitments are already live in production. Backfill sets
-- published_at = created_at so the new phase computation treats them as
-- non-draft.

update recruitments
   set published_at = coalesce(published_at, created_at)
 where published_at is null;

-- ---- 4) Backfill: 3 default questions for existing recruitments ----------
-- Only insert if the recruitment has no questions yet (safe re-run).

insert into drive_questions (recruitment_id, prompt, sort_order, required)
select r.id, 'Why do you want to join?', 0, true
  from recruitments r
 where not exists (
   select 1 from drive_questions q where q.recruitment_id = r.id
 );

insert into drive_questions (recruitment_id, prompt, sort_order, required)
select r.id, 'Relevant experience or skills', 1, true
  from recruitments r
 where not exists (
   select 1 from drive_questions q
    where q.recruitment_id = r.id and q.sort_order = 1
 );

insert into drive_questions (recruitment_id, prompt, sort_order, required)
select r.id, 'What can you contribute?', 2, false
  from recruitments r
 where not exists (
   select 1 from drive_questions q
    where q.recruitment_id = r.id and q.sort_order = 2
 );

-- ---- 5) Updated recruitment_phase function -------------------------------
-- Adds 'draft' phase. Order matters: draft check comes FIRST.

create or replace function recruitment_phase(recruitment_id_in uuid)
returns text
language sql
stable
as $$
  select case
    when r.published_at is null then 'draft'
    when r.results_published_at is not null then 'result'
    when r.deadline is null then 'open'
    when now() < r.deadline then 'open'
    else 'review'
  end
  from recruitments r
  where r.id = recruitment_id_in;
$$;

grant execute on function recruitment_phase(uuid) to anon, authenticated;

-- ---- 6) enforce_application_phase trigger — draft awareness --------------
-- Applications cannot be created against a drive still in draft.
-- This is a light addition; the existing trigger stays otherwise identical.

create or replace function enforce_application_phase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  phase text;
  is_admin boolean := false;
begin
  -- Honor bypass GUC for legitimate admin operations (e.g. remove_member)
  begin
    if current_setting('app.bypass_phase_check', true) = 'true' then
      return coalesce(new, old);
    end if;
  exception when others then
    null;
  end;

  select recruitment_phase(coalesce(new.recruitment_id, old.recruitment_id)) into phase;

  -- 16A: block application creation/edit against drafts
  if phase = 'draft' then
    raise exception 'This drive is not yet published.'
      using errcode = '22023';
  end if;

  -- Existing behavior below (unchanged)
  select exists (
    select 1 from club_admins ca
     join recruitments r on r.club_id = ca.club_id
    where r.id = coalesce(new.recruitment_id, old.recruitment_id)
      and ca.profile_id = auth.uid()
  ) into is_admin;

  if phase = 'result' and not coalesce(is_admin, false) then
    raise exception 'This application is locked.'
      using errcode = '22023';
  end if;

  if phase = 'open' then
    if new is not null and new.status not in ('pending', 'withdrawn') then
      raise exception 'Decisions can only be made after the deadline.'
        using errcode = '22023';
    end if;
    return new;
  end if;

  if phase = 'review' then
    if new is not null and not coalesce(is_admin, false) then
      raise exception 'Your application is under review and cannot be edited.'
        using errcode = '22023';
    end if;
    if new is not null and new.status = 'withdrawn' then
      raise exception 'Withdrawn is a student-only state.'
        using errcode = '22023';
    end if;
    return new;
  end if;

  return coalesce(new, old);
end;
$$;

-- =========================================================================
-- Sanity checks — uncomment to verify locally
-- =========================================================================
--
-- select count(*) as total_recruitments from recruitments;
-- select count(*) as with_target_years from recruitments where target_years is not null;
-- select count(*) as published from recruitments where published_at is not null;
-- select count(*) as questions_total from drive_questions;
-- select recruitment_id, count(*) as q_count
--   from drive_questions group by recruitment_id order by q_count;
