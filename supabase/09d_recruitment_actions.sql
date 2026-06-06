-- =============================================================================
-- 09d_recruitment_actions.sql
-- "Start new recruitment" + "Remove member" functions.
-- =============================================================================

-- 1) New columns on recruitments + clubs
alter table recruitments
  add column if not exists interview_whatsapp_link text,
  add column if not exists interview_mode text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'recruitments_interview_mode_check'
  ) then
    alter table recruitments
      add constraint recruitments_interview_mode_check
      check (interview_mode is null or interview_mode in ('online', 'offline', 'hybrid'));
  end if;
end $$;

alter table clubs
  add column if not exists community_whatsapp_link text;

-- 2) Update the phase trigger to honor a function-level bypass signal.
--    remove_member sets `app.bypass_phase_check = 'true'` for its update
--    statement; the trigger short-circuits when it sees this.
create or replace function enforce_application_phase()
returns trigger
language plpgsql
as $$
declare
  phase text;
  is_super boolean;
  is_admin boolean;
  rec_id uuid;
  rec_club_id uuid;
  bypass text;
begin
  -- Function-level bypass (used by remove_member). Custom GUC; current_setting
  -- with missing_ok=true returns null if not set.
  bypass := current_setting('app.bypass_phase_check', true);
  if bypass = 'true' then
    return coalesce(new, old);
  end if;

  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  if coalesce(is_super, false) then
    return coalesce(new, old);
  end if;

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

-- 3) start_new_recruitment — lead/manager (or super_admin)
create or replace function start_new_recruitment(
  club_id_in uuid,
  name_in text,
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text default null,
  interview_mode_in text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
  can_manage boolean;
  current_rec_id uuid;
  current_phase text;
  new_id uuid;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select can_manage_applications(club_id_in) into can_manage;

  if not (coalesce(is_super, false) or coalesce(can_manage, false)) then
    raise exception 'Only leads and managers can start a new recruitment.'
      using errcode = '42501';
  end if;

  select id into current_rec_id
    from recruitments where club_id = club_id_in
   order by created_at desc limit 1;

  if current_rec_id is not null then
    select recruitment_phase(current_rec_id) into current_phase;
    if current_phase in ('open', 'review') then
      raise exception 'The current recruitment is still %. Publish or wait for it to finish before starting a new one.', current_phase
        using errcode = '22023';
    end if;
  end if;

  if deadline_in is not null and result_date_in is not null
     and result_date_in < deadline_in then
    raise exception 'Result date cannot be before the deadline.'
      using errcode = '22023';
  end if;

  if interview_mode_in is not null
     and interview_mode_in not in ('online', 'offline', 'hybrid') then
    raise exception 'Interview mode must be online, offline, or hybrid.'
      using errcode = '22023';
  end if;

  insert into recruitments (
    club_id, name, deadline, result_date,
    interview_whatsapp_link, interview_mode, created_by
  ) values (
    club_id_in,
    coalesce(nullif(trim(name_in), ''), 'Recruitment'),
    deadline_in, result_date_in,
    nullif(trim(interview_whatsapp_link_in), ''),
    nullif(trim(interview_mode_in), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function start_new_recruitment(uuid, text, timestamptz, timestamptz, text, text)
  to authenticated;

-- 4) remove_member — lead-only (or super_admin). Atomic delete + status flip.
--    Uses the `app.bypass_phase_check` GUC to short-circuit the trigger.
create or replace function remove_member(
  club_id_in uuid,
  profile_id_in uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
  is_lead  boolean;
  target_is_lead boolean;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();

  select exists (
    select 1 from club_admins
     where club_id = club_id_in
       and profile_id = auth.uid()
       and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can remove members.' using errcode = '42501';
  end if;

  -- Cannot remove another lead (super_admin can override)
  select exists (
    select 1 from club_admins
     where club_id = club_id_in
       and profile_id = profile_id_in
       and admin_role = 'lead'
  ) into target_is_lead;

  if coalesce(target_is_lead, false) and not coalesce(is_super, false) then
    raise exception 'You cannot remove another lead.' using errcode = '42501';
  end if;

  -- Delete the roster row
  delete from club_members
   where club_id = club_id_in and profile_id = profile_id_in;

  -- Flip the most recent accepted application to 'removed', bypassing the
  -- phase trigger via the GUC signal. set_config(..., true) = LOCAL scope.
  perform set_config('app.bypass_phase_check', 'true', true);
  update applications
     set status = 'removed'
   where id = (
     select id from applications
      where club_id = club_id_in
        and profile_id = profile_id_in
        and status = 'accepted'
      order by created_at desc
      limit 1
   );
end;
$$;

grant execute on function remove_member(uuid, uuid) to authenticated;
