-- =========================================================================
-- 16C — Mandatory interview_whatsapp_link on drive creation
-- =========================================================================
-- Extends create_drive + update_drive RPCs to accept interview_whatsapp_link.
-- Adds validation on both: link required at create + publish time.
-- Existing drives with NULL interview_whatsapp_link are permitted to remain,
-- but any edit via update_drive requires a non-null link.
-- =========================================================================

-- ---- 1) create_drive with mandatory interview link ----------------------

drop function if exists create_drive(uuid, text, text, int[], timestamptz, timestamptz);

create or replace function create_drive(
  club_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text  -- 16C: new required param
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

  -- 16C: interview link required at creation
  if interview_whatsapp_link_in is null
     or length(trim(interview_whatsapp_link_in)) = 0 then
    raise exception 'Interview WhatsApp link is required.'
      using errcode = '22023';
  end if;

  -- Create drive (draft mode: published_at is null)
  insert into recruitments (
    club_id, name, description, target_years,
    deadline, result_date,
    interview_whatsapp_link,
    created_by, published_at
  ) values (
    club_id_in, trim(name_in),
    nullif(trim(coalesce(description_in, '')), ''),
    target_years_in,
    deadline_in, result_date_in,
    trim(interview_whatsapp_link_in),
    auth.uid(), null
  )
  returning id into new_drive_id;

  -- No auto-populated questions (dropped in 16B)

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

grant execute on function create_drive(uuid, text, text, int[], timestamptz, timestamptz, text) to authenticated;


-- ---- 2) update_drive with mandatory interview link -----------------------

drop function if exists update_drive(uuid, text, text, int[], timestamptz, timestamptz);

create or replace function update_drive(
  drive_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text  -- 16C: new required param
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_club_id uuid;
  is_super boolean;
  tier text;
  phase text;
begin
  select club_id into the_club_id from recruitments where id = drive_id_in;
  if the_club_id is null then
    raise exception 'Drive not found.' using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  select admin_role into tier from club_admins
    where club_id = the_club_id and profile_id = auth.uid();

  if not (coalesce(is_super, false) or tier in ('lead', 'manager')) then
    raise exception 'Only lead, manager, or sysadmin can edit drives.'
      using errcode = '42501';
  end if;

  -- 16B addendum 2: soft-gate review edits (only result phase blocks)
  select recruitment_phase(drive_id_in) into phase;
  if phase = 'result' then
    raise exception 'Drive is locked in result phase — cannot edit.'
      using errcode = '22023';
  end if;

  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Drive name is required.' using errcode = '22023';
  end if;
  if array_length(target_years_in, 1) is null then
    raise exception 'At least one target year is required.' using errcode = '22023';
  end if;

  -- 16C: interview link required on every edit
  if interview_whatsapp_link_in is null
     or length(trim(interview_whatsapp_link_in)) = 0 then
    raise exception 'Interview WhatsApp link is required.'
      using errcode = '22023';
  end if;

  update recruitments
     set name = trim(name_in),
         description = nullif(trim(coalesce(description_in, '')), ''),
         target_years = target_years_in,
         deadline = deadline_in,
         result_date = result_date_in,
         interview_whatsapp_link = trim(interview_whatsapp_link_in)
   where id = drive_id_in;
end;
$$;

grant execute on function update_drive(uuid, text, text, int[], timestamptz, timestamptz, text) to authenticated;


-- ---- 3) publish_drive — enforce interview link at publish time -----------

create or replace function publish_drive(drive_id_in uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_club_id uuid;
  is_super boolean;
  is_lead boolean;
  phase text;
  drive_target_years int[];
  drive_deadline timestamptz;
  drive_interview_link text;
  question_count int;
begin
  select club_id, target_years, deadline, interview_whatsapp_link
    into the_club_id, drive_target_years, drive_deadline, drive_interview_link
    from recruitments where id = drive_id_in;
  if the_club_id is null then
    raise exception 'Drive not found.' using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = the_club_id
      and profile_id = auth.uid()
      and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can publish drives.'
      using errcode = '42501';
  end if;

  select recruitment_phase(drive_id_in) into phase;
  if phase != 'draft' then
    raise exception 'Only drafts can be published. This drive is %.', phase
      using errcode = '22023';
  end if;

  if array_length(drive_target_years, 1) is null then
    raise exception 'Cannot publish: at least one target year required.'
      using errcode = '22023';
  end if;
  if drive_deadline is null then
    raise exception 'Cannot publish: deadline is required.'
      using errcode = '22023';
  end if;

  -- 16C: interview link required at publish
  if drive_interview_link is null
     or length(trim(drive_interview_link)) = 0 then
    raise exception 'Cannot publish: interview WhatsApp link is required.'
      using errcode = '22023';
  end if;

  select count(*) into question_count
    from drive_questions where recruitment_id = drive_id_in;
  if question_count = 0 then
    raise exception 'Cannot publish: at least one question required.'
      using errcode = '22023';
  end if;

  update recruitments
     set published_at = now()
   where id = drive_id_in;

  insert into audit_log (actor_id, action, target_club_id, details)
  values (
    auth.uid(), 'publish_drive', the_club_id,
    jsonb_build_object(
      'drive_id', drive_id_in,
      'question_count', question_count
    )
  );
end;
$$;

-- =========================================================================
-- Sanity checks — uncomment to verify locally
-- =========================================================================
--
-- -- Drives without interview link (post-migration these will need updating):
-- select id, name, interview_whatsapp_link, published_at
--   from recruitments where interview_whatsapp_link is null;
--
-- -- Try to update a drive with no interview link (should fail):
-- -- select update_drive(
-- --   '<some_drive_id>'::uuid, 'Test', null, array[1,2],
-- --   now() + interval '7 days', null, null
-- -- );
-- -- Expected: "Interview WhatsApp link is required."
