-- =========================================================================
-- 17C follow-up: delete_drive gates on LIVE applications only
-- =========================================================================
-- Bug: `delete_drive` counted all applications for the open-phase gate,
-- so a single withdrawn/removed application blocked deletion even though
-- nothing was actually at stake.
--
-- Fix: only pending / reviewing / accepted / rejected count as "live".
-- Withdrawn (student pulled out) and removed (post-publish flip) are
-- terminal states and shouldn't hold a drive hostage.
--
-- No schema changes. Idempotent (create or replace). Grants unchanged.
-- =========================================================================

create or replace function delete_drive(drive_id_in uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  the_club_id uuid;
  is_super boolean;
  is_lead boolean;
  phase text;
  app_count int;
begin
  select club_id into the_club_id from recruitments where id = drive_id_in;
  if the_club_id is null then
    raise exception 'Drive not found.' using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = the_club_id and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can delete drives.' using errcode = '42501';
  end if;

  select recruitment_phase(drive_id_in) into phase;

  if phase in ('review', 'result') then
    raise exception 'Cannot delete drive in % phase.', phase
      using errcode = '22023';
  end if;

  if phase = 'open' then
    -- Live = anything that isn't terminal. Withdrawn/removed apps don't count
    -- toward the gate — nothing is lost by deleting the drive under them.
    select count(*) into app_count
      from applications
      where recruitment_id = drive_id_in
        and status not in ('withdrawn', 'removed');
    if app_count > 0 then
      raise exception 'Cannot delete open drive with % active application(s).', app_count
        using errcode = '22023';
    end if;
  end if;

  -- Drive_questions cascade via FK
  delete from recruitments where id = drive_id_in;

  insert into audit_log (actor_id, action, target_club_id, details)
  values (
    auth.uid(), 'delete_drive', the_club_id,
    jsonb_build_object(
      'drive_id', drive_id_in,
      'phase_at_deletion', phase
    )
  );
end;
$$;

grant execute on function delete_drive(uuid) to authenticated;
