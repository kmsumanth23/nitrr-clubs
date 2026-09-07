-- =========================================================================
-- 19 — Security hardening
-- =========================================================================
-- 1. applicant_year snapshot on applications (tamper-proof via trigger)
-- 2. 6-month freeze on profiles.year updates (sysadmin bypass)
--
-- Snapshot column captures the profile.year AT APPLY TIME so admins can
-- detect year-impersonation (student who changed year to game a drive's
-- target_years eligibility).
--
-- Year freeze prevents rapid back-and-forth: student can change year at
-- most once every 6 months. Sysadmins bypass for legitimate corrections.
-- =========================================================================


-- ---- 1) applicant_year column on applications --------------------------

alter table applications
  add column if not exists applicant_year int null
    check (applicant_year is null or applicant_year between 1 and 4);


-- ---- 2) Backfill existing applications (migration snapshot) ------------
--
-- These are NOT tamper-proof apply-time snapshots — they reflect current
-- profile.year at migration time. Documented in the audit as "migration
-- snapshots, not apply-time snapshots" so admins interpret them correctly.
-- Only affects pre-19 rows; new applications get real snapshots via trigger.
--
-- Lesson 4: `trg_enforce_application_phase` blocks any UPDATE against
-- applications whose drive is in result phase (post-publish freeze). This
-- backfill touches all rows including result-phase ones, so the trigger
-- would reject with "This application is locked" (errcode 22023). Disable
-- the trigger for the duration of the backfill, then re-enable.
-- Same pattern used in 09c_recruitments.sql migration.

alter table applications disable trigger trg_enforce_application_phase;

update applications a
   set applicant_year = p.year
  from profiles p
 where a.profile_id = p.id
   and a.applicant_year is null
   and p.year is not null;

alter table applications enable trigger trg_enforce_application_phase;


-- ---- 3) Snapshot trigger on applications INSERT ------------------------
--
-- Reads profile.year at INSERT time and writes to applicant_year.
-- SECURITY DEFINER = trigger runs as owner, bypassing RLS for the profile
-- read. Application client can't override this by passing applicant_year
-- because we IGNORE any provided value and overwrite it.

create or replace function snapshot_applicant_year()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year int;
begin
  select year into current_year
    from profiles where id = new.profile_id;

  -- Overwrite any client-provided value with the authoritative snapshot
  new.applicant_year := current_year;
  return new;
end;
$$;

drop trigger if exists snapshot_applicant_year_trigger on applications;

create trigger snapshot_applicant_year_trigger
  before insert on applications
  for each row execute function snapshot_applicant_year();


-- ---- 4) year_updated_at column on profiles -----------------------------

alter table profiles
  add column if not exists year_updated_at timestamptz null;


-- ---- 5) Backfill year_updated_at for existing profiles -----------------
--
-- Set to created_at so existing users can update their year immediately
-- (their signup date is likely > 6 months ago). New profiles will have
-- year_updated_at set to first-time year completion via the trigger.

update profiles
   set year_updated_at = coalesce(created_at, now() - interval '1 year')
 where year_updated_at is null
   and year is not null;


-- ---- 6) 6-month freeze trigger on profiles UPDATE ----------------------
--
-- Only fires when profiles.year is actually changing.
-- - First-time year setting (old.year is null): allow, stamp year_updated_at
-- - Sysadmin: always allow, stamp
-- - Regular user: only allow if last update was >6 months ago
--
-- SECURITY DEFINER + set search_path = public prevents search-path attacks
-- against the is_super_admin subquery.

create or replace function enforce_year_freeze()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
begin
  -- Sysadmin bypass (unconditional)
  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  if coalesce(is_super, false) then
    new.year_updated_at := now();
    return new;
  end if;

  -- First-time year setting: allow (no prior year to freeze against)
  if old.year is null then
    new.year_updated_at := now();
    return new;
  end if;

  -- Rate limit: last update must be > 6 months ago
  if old.year_updated_at is not null
     and old.year_updated_at > (now() - interval '6 months') then
    raise exception 'Your year is locked until %. Contact a sysadmin if you need to change it earlier.',
      to_char(old.year_updated_at + interval '6 months', 'DD Mon YYYY')
      using errcode = '42501';
  end if;

  -- Passed the freeze — allow the change, stamp new timestamp
  new.year_updated_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_year_freeze_trigger on profiles;

create trigger enforce_year_freeze_trigger
  before update on profiles
  for each row
  when (new.year is distinct from old.year)
  execute function enforce_year_freeze();


-- =========================================================================
-- Sanity checks (uncomment locally to verify)
-- =========================================================================
--
-- -- Verify columns added
-- select column_name, data_type from information_schema.columns
-- where table_name = 'applications' and column_name = 'applicant_year';
-- -- Expected: 1 row
--
-- select column_name, data_type from information_schema.columns
-- where table_name = 'profiles' and column_name = 'year_updated_at';
-- -- Expected: 1 row
--
-- -- Verify backfill count
-- select count(*) from applications where applicant_year is not null;
-- -- Expected: total applications count (matches pre-existing rows with valid profile.year)
--
-- -- Verify triggers exist
-- select trigger_name, event_manipulation from information_schema.triggers
-- where trigger_name in ('snapshot_applicant_year_trigger', 'enforce_year_freeze_trigger');
-- -- Expected: 2 rows
--
-- -- Test snapshot: try to override applicant_year via INSERT (must be ignored)
-- -- insert into applications (recruitment_id, profile_id, status, responses, applicant_year)
-- -- values ('<uuid>', '<uuid>', 'pending', '{}', 999);
-- -- Then verify: select applicant_year from applications where id = '<new_id>';
-- -- Expected: profile.year (not 999)
--
-- -- Test freeze: as a non-sysadmin, try changing year twice in a row
-- -- (Should fail on the second attempt with 42501)
