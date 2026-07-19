-- =========================================================================
-- 17A — Drive-specific community WhatsApp link
-- =========================================================================
-- Adds recruitments.community_whatsapp_link (nullable).
-- Extends create_drive + update_drive to accept it.
-- Adds new RPC update_drive_community_link — allowed in ALL lifecycle phases
-- including result (special carve-out for post-publish community group swap).
-- =========================================================================

-- ---- 1) New column -------------------------------------------------------

alter table recruitments
  add column if not exists community_whatsapp_link text null;

-- ---- 2) create_drive with optional community link -----------------------

drop function if exists create_drive(uuid, text, text, int[], timestamptz, timestamptz, text);

create or replace function create_drive(
  club_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text,
  community_whatsapp_link_in text  -- 17A: new optional param
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

  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Drive name is required.'
      using errcode = '22023';
  end if;

  if array_length(target_years_in, 1) is null then
    raise exception 'At least one target year is required.'
      using errcode = '22023';
  end if;

  if interview_whatsapp_link_in is null
     or length(trim(interview_whatsapp_link_in)) = 0 then
    raise exception 'Interview WhatsApp link is required.'
      using errcode = '22023';
  end if;

  insert into recruitments (
    club_id, name, description, target_years,
    deadline, result_date,
    interview_whatsapp_link,
    community_whatsapp_link,
    created_by, published_at
  ) values (
    club_id_in, trim(name_in),
    nullif(trim(coalesce(description_in, '')), ''),
    target_years_in,
    deadline_in, result_date_in,
    trim(interview_whatsapp_link_in),
    nullif(trim(coalesce(community_whatsapp_link_in, '')), ''),
    auth.uid(), null
  )
  returning id into new_drive_id;

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

grant execute on function create_drive(
  uuid, text, text, int[], timestamptz, timestamptz, text, text
) to authenticated;


-- ---- 3) update_drive with optional community link ------------------------

drop function if exists update_drive(uuid, text, text, int[], timestamptz, timestamptz, text);

create or replace function update_drive(
  drive_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text,
  community_whatsapp_link_in text  -- 17A: new optional param
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

  select recruitment_phase(drive_id_in) into phase;
  if phase = 'result' then
    raise exception 'Drive is locked in result phase — use update_drive_community_link to change the community link.'
      using errcode = '22023';
  end if;

  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Drive name is required.' using errcode = '22023';
  end if;
  if array_length(target_years_in, 1) is null then
    raise exception 'At least one target year is required.' using errcode = '22023';
  end if;

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
         interview_whatsapp_link = trim(interview_whatsapp_link_in),
         community_whatsapp_link = nullif(trim(coalesce(community_whatsapp_link_in, '')), '')
   where id = drive_id_in;
end;
$$;

grant execute on function update_drive(
  uuid, text, text, int[], timestamptz, timestamptz, text, text
) to authenticated;


-- ---- 4) NEW: update_drive_community_link — allowed in ALL phases ---------
-- Special carve-out: post-publish (result phase), community link can still
-- be updated so clubs can swap WhatsApp groups after members are added.
-- No other fields editable via this RPC.

create or replace function update_drive_community_link(
  drive_id_in uuid,
  community_whatsapp_link_in text
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
    raise exception 'Only lead, manager, or sysadmin can edit community link.'
      using errcode = '42501';
  end if;

  -- No phase gate here — result phase is fine (that's the whole point)
  update recruitments
     set community_whatsapp_link = nullif(trim(coalesce(community_whatsapp_link_in, '')), '')
   where id = drive_id_in;
end;
$$;

grant execute on function update_drive_community_link(uuid, text) to authenticated;

-- =========================================================================
-- Sanity checks — uncomment to verify locally
-- =========================================================================
--
-- -- Verify column added
-- select column_name, data_type
-- from information_schema.columns
-- where table_name = 'recruitments' and column_name = 'community_whatsapp_link';
--
-- -- Test the new RPC on a result-phase drive:
-- -- select update_drive_community_link('<drive_uuid>', 'https://chat.whatsapp.com/xyz');
