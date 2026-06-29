-- =============================================================================
-- 14d_delete_archived_patch.sql
-- Patch: bypass last-lead protection trigger during permanent deletion.
-- The cascade DELETE on club_admins trips the BEFORE DELETE trigger.
-- We need to signal "this is a legitimate full-club wipe, not an admin removal."
--
-- Mirrors the GUC pattern from 9f-2 (lesson 11):
-- set_config('app.<flag>', 'true', true) → trigger reads, skips check.
-- =============================================================================

-- Step 1: update the last-lead protection trigger to honor the bypass flag.
-- The trigger function already exists (from 12a); we modify it to check
-- the GUC. CREATE OR REPLACE preserves the trigger attachment.

create or replace function protect_last_lead()
returns trigger
language plpgsql
as $$
declare
  remaining_leads int;
  bypass_flag text;
begin
  -- Allow bypass when called from a wholesale club-wipe function
  bypass_flag := current_setting('app.bypass_last_lead_check', true);
  if bypass_flag = 'true' then
    return old;
  end if;

  -- Original check: refuse if this would remove the last lead
  if old.admin_role = 'lead' then
    select count(*) into remaining_leads
      from club_admins
     where club_id = old.club_id
       and admin_role = 'lead'
       and profile_id <> old.profile_id;

    if remaining_leads = 0 then
      raise exception
        'Cannot remove or demote the last lead of this club. Assign another lead first, or ask a super_admin to decommission the club.'
        using errcode = '42501';
    end if;
  end if;

  return old;
end;
$$;

-- Step 2: update delete_archived_club to set the bypass flag.
-- This is the same function from 14d_delete_archived.sql, with one new line
-- before the destructive deletes.

create or replace function delete_archived_club(
  club_id_in uuid,
  slug_confirm text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  club_row clubs%rowtype;
begin
  if not is_super_admin() then
    raise exception 'Only sysadmin can permanently delete clubs.'
      using errcode = '42501';
  end if;

  select * into club_row from clubs where id = club_id_in;
  if club_row.id is null then
    raise exception 'Club not found.' using errcode = '22023';
  end if;

  if club_row.archived_at is null then
    raise exception
      'Club must be decommissioned (archived) before permanent deletion.'
      using errcode = '22023';
  end if;

  if club_row.slug <> slug_confirm then
    raise exception
      'Slug confirmation does not match. Expected "%", got "%".',
      club_row.slug, slug_confirm
      using errcode = '22023';
  end if;

  -- Audit entry FIRST (target_club_id NULL since club is about to vanish)
  insert into audit_log (
    actor_id, action, target_club_id, details
  ) values (
    auth.uid(),
    'permanent_delete_club',
    null,
    jsonb_build_object(
      'club_id',     club_row.id,
      'club_slug',   club_row.slug,
      'club_name',   club_row.name,
      'archived_at', club_row.archived_at 
    )
  );

  -- Detach old audit entries to preserve history
  update audit_log
     set target_club_id = null
   where target_club_id = club_id_in;

  -- *** NEW: signal the last-lead trigger to skip its check ***
  perform set_config('app.bypass_last_lead_check', 'true', true);

  -- Cascade delete in dependency order
  delete from applications     where club_id = club_id_in;
  delete from gallery_photos   where club_id = club_id_in;
  delete from club_members     where club_id = club_id_in;
  delete from club_admins      where club_id = club_id_in;
  delete from club_team        where club_id = club_id_in;
  delete from events           where club_id = club_id_in;
  delete from recruitments     where club_id = club_id_in;
  delete from clubs            where id = club_id_in;
end;
$$;