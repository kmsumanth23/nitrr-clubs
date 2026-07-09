-- =========================================================================
-- 16B — Drop the 3-default-questions concept + reset applications data
-- =========================================================================
-- The 3 auto-populated defaults concept goes away in 16B. Clubs now build
-- their questions from scratch (Google-Forms style). This migration:
--
--   1. Purges all existing applications — their responses use the old
--      {motivation, experience, contribution} shape which can't cleanly
--      round-trip once we wipe the questions those responses referenced.
--
--   2. Wipes every drive_questions row — all currently populated rows are
--      the 3 auto-populated defaults from the Round-1 backfill or from
--      create_drive's now-obsolete auto-populate step. After this, existing
--      published drives have zero questions until the admin adds some.
--
--   3. Rewrites create_drive RPC to skip the auto-populate step. New drives
--      now start with zero questions. publish_drive's ≥1-question check
--      stays — admins must add at least one question before they can
--      publish.
--
-- Data loss warning: any live student applications submitted since deploy
-- (2026-06-17) get deleted. If you want to preserve any real applications,
-- back them up before running this migration.
--
-- Safe to re-run: DELETE + CREATE OR REPLACE are idempotent, and after the
-- first run the DELETEs target empty tables.
-- =========================================================================

-- ---- 1) Purge existing applications --------------------------------------
-- The enforce_application_phase trigger blocks direct deletes when phase
-- would trip its logic (e.g. 'result' phase). Bypass via GUC — legitimate
-- admin data reset.

select set_config('app.bypass_phase_check', 'true', false);
delete from applications;

-- ---- 2) Wipe all drive_questions rows ------------------------------------
-- Every existing row is one of the 3 auto-populated defaults (from
-- 16a_drive_schema.sql backfill or 16a_drive_rpcs.sql create_drive
-- auto-populate). Post-wipe, all existing drives have zero questions.

delete from drive_questions;

-- ---- 3) Rewrite create_drive to skip auto-populate -----------------------
-- Same signature and auth as 16A. Only change: the auto-populate INSERT
-- block is removed. New drives start with zero questions until the admin
-- adds them via the drive editor UI.

create or replace function create_drive(
  club_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
  is_lead boolean;
  new_drive_id uuid;
begin
  -- Auth check
  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = club_id_in
      and profile_id = auth.uid()
      and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can create drives.'
      using errcode = '42501';
  end if;

  -- Validation
  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Drive name is required.'
      using errcode = '22023';
  end if;

  if array_length(target_years_in, 1) is null then
    raise exception 'At least one target year is required.'
      using errcode = '22023';
  end if;

  -- Create drive (draft mode)
  insert into recruitments (
    club_id, name, description, target_years,
    deadline, result_date,
    created_by, published_at
  ) values (
    club_id_in, trim(name_in),
    nullif(trim(coalesce(description_in, '')), ''),
    target_years_in,
    deadline_in, result_date_in,
    auth.uid(), null
  )
  returning id into new_drive_id;

  -- 16B: NO auto-populated questions. Admin builds them from scratch.

  -- Audit
  insert into audit_log (actor_id, action, target_club_id, details)
  values (
    auth.uid(), 'create_drive', club_id_in,
    jsonb_build_object(
      'drive_id', new_drive_id,
      'name', name_in,
      'target_years', target_years_in
    )
  );

  return new_drive_id;
end;
$$;

grant execute on function create_drive(uuid, text, text, int[], timestamptz, timestamptz) to authenticated;

-- =========================================================================
-- Sanity checks — uncomment to verify locally
-- =========================================================================
--
-- select count(*) as applications_remaining from applications;
--   -- expect: 0
-- select count(*) as drive_questions_remaining from drive_questions;
--   -- expect: 0
-- select count(*) as drives_total from recruitments;
--   -- unchanged from before
-- select count(*) as club_members_untouched from club_members;
--   -- unchanged (members live independently of applications post-publish)
