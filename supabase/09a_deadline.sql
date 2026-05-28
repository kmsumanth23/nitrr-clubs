-- ============================================================
-- NITRR Clubs — 09a_deadline.sql
-- Recruitment deadline on clubs + a hard server-side wall on applications.
-- Safe to re-run.
-- ============================================================

-- ---------- deadline column ----------
alter table clubs
  add column if not exists recruitment_deadline timestamptz;

-- Seed a far-future deadline on existing clubs so nothing is locked while you
-- test. (Set real deadlines per club later, via admin UI in 9b/9c.)
update clubs
  set recruitment_deadline = now() + interval '90 days'
  where recruitment_deadline is null;

-- ---------- TRIGGER: enforce the deadline wall ----------
-- Blocks creating OR modifying an application once the club's deadline passed.
-- This is the hard gate; the app code also checks (friendly errors) but this
-- guarantees it even against crafted requests. Admin-side status changes are
-- exempt (handled by the manager+ RLS policies; this only fires for the
-- applicant's own pending/withdrawn churn).
create or replace function enforce_application_deadline()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  dl timestamptz;
begin
  select recruitment_deadline into dl from clubs where id = new.club_id;

  -- Only enforce for the applicant acting on their own row. Admins managing
  -- status (manager+/super_admin) are allowed through regardless of deadline.
  if new.profile_id = auth.uid() then
    if dl is not null and now() > dl then
      raise exception
        'Applications for this club are closed. You may contact the club lead for queries.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_application_deadline on applications;
create trigger trg_enforce_application_deadline
  before insert or update on applications
  for each row execute function enforce_application_deadline();
