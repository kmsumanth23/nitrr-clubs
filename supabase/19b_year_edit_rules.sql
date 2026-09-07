-- =========================================================================
-- 19b — Year edit rules redesign
-- =========================================================================
-- Replaces step 19's naive 6-month freeze (which trapped students who
-- mistyped their year at signup for half a year) with a two-gate model:
--
--   * SOFT CAP  — 3 lifetime year-change chances per profile.
--                 Counter decrements per self-service change.
--                 Sysadmin overrides do NOT decrement.
--                 TODO (step 26): reset to 3 on semester tick.
--
--   * HARD FREEZE — Blocks self-service year edits while the student has
--                   any 'pending' or 'reviewing' application. Prevents the
--                   "change year → apply to wrong-year drive → get into
--                   interview WhatsApp group → make nuisance" attack.
--                   Once the drive moves past review (admin accepted/
--                   rejected the app, or student withdrew, or results
--                   published), the freeze lifts automatically.
--
--   * SYSADMIN BYPASS — Escape hatch via admin_set_profile_year() RPC.
--                       Bypasses both gates. Writes audit_log entry.
--                       Reached from the diagnostics UI.
--
-- Snapshot + mismatch pill from step 19 stay untouched — they remain the
-- primary detective control against year-impersonation on applications.
-- =========================================================================


-- ---- 1) Drop step 19's freeze trigger + function ------------------------

drop trigger if exists enforce_year_freeze_trigger on profiles;
drop function if exists enforce_year_freeze();


-- ---- 2) Add the soft-cap counter column ---------------------------------

alter table profiles
  add column if not exists year_changes_remaining int not null default 3;

-- Existing profiles get a fresh grant of 3. Semester-reset (step 26) will
-- restore any user's counter regardless of starting value.
update profiles set year_changes_remaining = 3
  where year_changes_remaining is null or year_changes_remaining < 0;


-- ---- 3) New rules trigger -----------------------------------------------
--
-- Fires BEFORE UPDATE on profiles WHEN new.year IS DISTINCT FROM old.year.
-- Six branches, in order:
--
--   a. Sysadmin bypass (auth.uid() is super_admin) — always allow, do NOT
--      decrement, stamp year_updated_at.
--   b. First-time year set (old.year is null) — always allow, do NOT
--      decrement, stamp year_updated_at.
--   c. Active-application block — reject if student has any pending or
--      reviewing application. Error 42501 with a helpful message.
--   d. Counter-exhausted block — reject if year_changes_remaining <= 0.
--      Error 42501 with a "contact a coordinator" message.
--   e. Allow: decrement counter by 1, stamp year_updated_at.
--
-- SECURITY DEFINER + set search_path = public prevents search-path attacks
-- against the auth.uid() lookups.

create or replace function enforce_year_edit_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
  bypass_flag text;
  has_active_app boolean;
begin
  -- Bypass A: `admin_set_profile_year` RPC sets this GUC to bypass. Uses
  -- the same pattern as `app.bypass_phase_check` (09d_recruitment_actions)
  -- so future admin-side operations can bypass cleanly without needing to
  -- run as a sysadmin session.
  bypass_flag := current_setting('app.bypass_year_edit_rules', true);
  if bypass_flag = 'true' then
    new.year_updated_at := now();
    return new;
  end if;

  -- Bypass B: Sysadmin session (auth.uid() resolves to super_admin).
  -- Covers Gladiator editing own year via /profile.
  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  if coalesce(is_super, false) then
    new.year_updated_at := now();
    return new;
  end if;

  -- First-time year set: signup completion. No freeze applies.
  if old.year is null then
    new.year_updated_at := now();
    return new;
  end if;

  -- Hard freeze: any pending or reviewing application locks the year edit.
  -- Narrow definition per design decision — accepted/rejected apps have
  -- already been reviewed by an admin, so year change can't mislead the
  -- interview-group reveal at that point.
  select exists (
    select 1 from applications
    where profile_id = new.id
      and status in ('pending', 'reviewing')
  ) into has_active_app;

  if has_active_app then
    raise exception 'Your year is locked while you have an application under review. It will unlock once the drive concludes. Contact a coordinator if you need to correct it sooner.'
      using errcode = '42501';
  end if;

  -- Soft cap: 3 lifetime changes. Sysadmin can top up via the RPC.
  if new.year_changes_remaining <= 0 then
    raise exception 'You have used all 3 year changes. Contact a coordinator to request a correction.'
      using errcode = '42501';
  end if;

  -- Allow: decrement and stamp. Client cannot bump the counter — we
  -- read `old.year_changes_remaining` to compute the new value, so any
  -- client-provided value gets overwritten.
  new.year_changes_remaining := old.year_changes_remaining - 1;
  new.year_updated_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_year_edit_rules_trigger on profiles;

create trigger enforce_year_edit_rules_trigger
  before update on profiles
  for each row
  when (new.year is distinct from old.year)
  execute function enforce_year_edit_rules();


-- ---- 4) admin_set_profile_year RPC --------------------------------------
--
-- Sysadmin-only escape hatch. Sets year on any profile without decrementing
-- their counter or checking freeze conditions. Writes an audit_log entry so
-- the override is traceable.
--
-- Uses the app.bypass_year_edit_rules GUC to short-circuit the trigger from
-- inside the same transaction. Session-scoped (`false` third arg to
-- set_config) means it persists to the update statement below, which is
-- what we need.

create or replace function admin_set_profile_year(
  profile_id_in uuid,
  new_year_in int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
  old_year int;
  target_full_name text;
begin
  -- Auth gate
  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  if not coalesce(is_super, false) then
    raise exception 'Only sysadmins can override a user''s year.'
      using errcode = '42501';
  end if;

  -- Validate
  if new_year_in is null or new_year_in not between 1 and 4 then
    raise exception 'Year must be an integer between 1 and 4.'
      using errcode = '22023';
  end if;

  -- Fetch old state for the audit entry
  select year, full_name into old_year, target_full_name
    from profiles where id = profile_id_in;
  if not found then
    raise exception 'Profile not found.' using errcode = '22023';
  end if;

  -- No-op guard: nothing to do if the year matches
  if old_year = new_year_in then
    return;
  end if;

  -- Bypass the trigger for this update — sysadmin override should not
  -- decrement the counter or check freeze conditions.
  perform set_config('app.bypass_year_edit_rules', 'true', true);

  update profiles set year = new_year_in where id = profile_id_in;

  -- Reset the bypass flag so subsequent statements in the same session
  -- don't accidentally inherit it.
  perform set_config('app.bypass_year_edit_rules', 'false', true);

  -- Audit trail
  insert into audit_log (actor_id, action, target_profile_id, details)
  values (
    auth.uid(),
    'admin_set_profile_year',
    profile_id_in,
    jsonb_build_object(
      'old_year', old_year,
      'new_year', new_year_in,
      'target_name', target_full_name
    )
  );
end;
$$;

grant execute on function admin_set_profile_year(uuid, int) to authenticated;


-- =========================================================================
-- Sanity checks (uncomment locally to verify)
-- =========================================================================
--
-- -- Column exists
-- select column_name, data_type, column_default from information_schema.columns
-- where table_name = 'profiles' and column_name = 'year_changes_remaining';
-- -- Expected: 1 row, default 3
--
-- -- Backfill worked
-- select count(*) as profiles_at_max
-- from profiles where year_changes_remaining = 3;
--
-- -- New trigger exists, old one gone
-- select trigger_name from information_schema.triggers
-- where trigger_name in ('enforce_year_edit_rules_trigger', 'enforce_year_freeze_trigger');
-- -- Expected: exactly 1 row = 'enforce_year_edit_rules_trigger'
--
-- -- Old function gone
-- select proname from pg_proc where proname in ('enforce_year_freeze', 'enforce_year_edit_rules');
-- -- Expected: exactly 1 row = 'enforce_year_edit_rules'
--
-- -- RPC exists with the right signature
-- select routine_name from information_schema.routines
-- where routine_name = 'admin_set_profile_year';
-- -- Expected: 1 row
