-- =============================================================================
-- scripts/preflight.sql
-- Pre-deploy verification of Supabase production state.
-- Paste into Supabase SQL Editor and run. Every check should return OK.
-- Investigate any FAIL row before deploying.
-- =============================================================================

-- 1) All expected tables exist and have RLS enabled
with expected_tables(name) as (
  values
    ('profiles'),
    ('categories'),
    ('clubs'),
    ('club_admins'),
    ('club_members'),
    ('club_team'),
    ('recruitments'),
    ('applications'),
    ('events'),
    ('gallery_photos'),
    ('faqs'),
    ('audit_log')
)
select
  'table: ' || e.name as check_name,
  case
    when t.tablename is null then 'FAIL: table missing'
    when not t.rowsecurity then 'FAIL: RLS disabled'
    else 'OK'
  end as result
from expected_tables e
left join pg_tables t
  on t.schemaname = 'public' and t.tablename = e.name
order by e.name;

-- 2) All expected SQL functions exist
with expected_functions(name) as (
  values
    ('is_super_admin'),
    ('is_club_admin'),
    ('can_edit_club_content'),
    ('can_manage_applications'),
    ('can_manage_admins'),
    ('club_tier'),
    ('recruitment_phase'),
    ('current_recruitment_for_club'),
    ('publish_recruitment_results'),
    ('start_new_recruitment'),
    ('remove_member'),
    ('can_manage_gallery'),
    ('club_id_from_slug'),
    ('can_manage_club_admins'),
    ('add_club_admin'),
    ('remove_club_admin'),
    ('change_club_admin_tier'),
    ('set_super_admin'),
    ('create_club'),
    ('decommission_club'),
    ('restore_club'),
    ('count_clubs_without_admins'),
    ('recruitments_overdue')
)
select
  'function: ' || e.name as check_name,
  case when p.proname is null then 'FAIL: function missing' else 'OK' end as result
from expected_functions e
left join pg_proc p on p.proname = e.name
left join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
order by e.name;

-- 3) Storage bucket exists and is public
select
  'storage bucket: club-gallery' as check_name,
  case
    when not exists (select 1 from storage.buckets where id = 'club-gallery')
      then 'FAIL: bucket missing'
    when (select public from storage.buckets where id = 'club-gallery') is not true
      then 'FAIL: bucket not public'
    else 'OK'
  end as result;

-- 4) Storage RLS policies exist on storage.objects
select
  'storage policies for club-gallery' as check_name,
  case
    when count(*) < 4 then 'FAIL: expected 4 policies (read/insert/update/delete), found ' || count(*)
    else 'OK (' || count(*) || ' policies)'
  end as result
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'club-gallery:%';

-- 5) Audit log writes are wired (sample check: have we ever audited anything?)
select
  'audit_log has entries' as check_name,
  case
    when count(*) = 0 then 'WARN: no audit entries yet (expected if no admin actions taken)'
    else 'OK (' || count(*) || ' entries)'
  end as result
from audit_log;

-- 6) At least one sysadmin exists
select
  'at least one sysadmin' as check_name,
  case
    when count(*) = 0 then 'FAIL: no sysadmin in profiles table'
    else 'OK (' || count(*) || ' sysadmin(s))'
  end as result
from profiles
where role = 'super_admin';

-- 7) Every active club has at least one admin (warning, not fail)
select
  'clubs without admins' as check_name,
  case
    when count(*) = 0 then 'OK'
    else 'WARN: ' || count(*) || ' active club(s) have no admins'
  end as result
from clubs c
where c.archived_at is null
  and not exists (select 1 from club_admins ca where ca.club_id = c.id);

-- 8) Phase trigger is active on applications
select
  'application phase trigger' as check_name,
  case
    when not exists (
      select 1 from information_schema.triggers
      where event_object_table = 'applications'
        and trigger_name like '%phase%'
    ) then 'FAIL: phase enforcement trigger missing'
    else 'OK'
  end as result;

-- 9) Recruitments table has the lifecycle columns
select
  'recruitments lifecycle columns' as check_name,
  case
    when count(*) < 5 then 'FAIL: expected 5 lifecycle columns, found ' || count(*)
    else 'OK'
  end as result
from information_schema.columns
where table_name = 'recruitments'
  and column_name in (
    'deadline',
    'result_date',
    'results_published_at',
    'results_published_by',
    'interview_mode'
  );

-- 10) clubs.archived_at column exists (12b)
select
  'clubs.archived_at exists' as check_name,
  case
    when not exists (
      select 1 from information_schema.columns
      where table_name = 'clubs' and column_name = 'archived_at'
    ) then 'FAIL: archived_at column missing (12b migration not applied)'
    else 'OK'
  end as result;

-- =============================================================================
-- Run this whole file as one query. Every row should say OK.
-- FAIL = blocker; investigate and rerun migrations as needed.
-- WARN = non-blocker but worth knowing (e.g. clubs with no admins).
-- =============================================================================
