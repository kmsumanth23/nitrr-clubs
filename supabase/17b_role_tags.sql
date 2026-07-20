-- =========================================================================
-- 17B — Role tags on drives + members
-- =========================================================================
-- Adds structural role tags to club_members (default 'volunteer'), the role
-- to assign at accept-time on recruitments (role_on_accept + optional label),
-- and a source_recruitment_id back-link on members that unlocks per-drive
-- community link resolution without the two-query hack from 17A.
--
-- Preserves publish_recruitment_results semantics — the only change is
-- populating the new columns on the club_members INSERT.
--
-- New RPCs: update_member_role, toggle_member_exclude_from_promote,
-- bulk_promote_members. All lead/sysadmin gated. All grants co-located.
-- =========================================================================


-- ---- 1) Schema additions -------------------------------------------------

-- club_members role columns
alter table club_members
  add column if not exists role text NOT NULL DEFAULT 'volunteer'
    CHECK (role IN ('volunteer', 'coordinator', 'core_coordinator', 'head_coordinator', 'overall_coordinator'));

alter table club_members
  add column if not exists role_label text NULL;

alter table club_members
  add column if not exists exclude_from_promote boolean NOT NULL DEFAULT false;

alter table club_members
  add column if not exists source_recruitment_id uuid NULL
    REFERENCES recruitments(id) ON DELETE SET NULL;

-- recruitments role columns
alter table recruitments
  add column if not exists role_on_accept text NOT NULL DEFAULT 'volunteer'
    CHECK (role_on_accept IN ('volunteer', 'coordinator', 'core_coordinator', 'head_coordinator', 'overall_coordinator'));

alter table recruitments
  add column if not exists role_label text NULL;


-- ---- 2) Extend create_drive with role params -----------------------------

drop function if exists create_drive(uuid, text, text, int[], timestamptz, timestamptz, text, text);

create or replace function create_drive(
  club_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text,
  community_whatsapp_link_in text,
  role_on_accept_in text,   -- 17B: new
  role_label_in text        -- 17B: new
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  is_super boolean;
  is_lead boolean;
  new_drive_id uuid;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = club_id_in and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can create drives.' using errcode = '42501';
  end if;

  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Drive name is required.' using errcode = '22023';
  end if;
  if array_length(target_years_in, 1) is null then
    raise exception 'At least one target year is required.' using errcode = '22023';
  end if;
  if interview_whatsapp_link_in is null or length(trim(interview_whatsapp_link_in)) = 0 then
    raise exception 'Interview WhatsApp link is required.' using errcode = '22023';
  end if;

  -- Default role_on_accept to volunteer if null/empty
  if role_on_accept_in is null or length(trim(role_on_accept_in)) = 0 then
    role_on_accept_in := 'volunteer';
  end if;

  insert into recruitments (
    club_id, name, description, target_years,
    deadline, result_date,
    interview_whatsapp_link, community_whatsapp_link,
    role_on_accept, role_label,
    created_by, published_at
  ) values (
    club_id_in, trim(name_in),
    nullif(trim(coalesce(description_in, '')), ''),
    target_years_in,
    deadline_in, result_date_in,
    trim(interview_whatsapp_link_in),
    nullif(trim(coalesce(community_whatsapp_link_in, '')), ''),
    role_on_accept_in,
    nullif(trim(coalesce(role_label_in, '')), ''),
    auth.uid(), null
  )
  returning id into new_drive_id;

  insert into audit_log (actor_id, action, target_club_id, details)
  values (
    auth.uid(), 'create_drive', club_id_in,
    jsonb_build_object(
      'drive_id', new_drive_id, 'name', name_in,
      'target_years', target_years_in, 'role_on_accept', role_on_accept_in
    )
  );

  return new_drive_id;
end;
$$;

grant execute on function create_drive(
  uuid, text, text, int[], timestamptz, timestamptz, text, text, text, text
) to authenticated;


-- ---- 3) Extend update_drive with role params -----------------------------

drop function if exists update_drive(uuid, text, text, int[], timestamptz, timestamptz, text, text);

create or replace function update_drive(
  drive_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text,
  community_whatsapp_link_in text,
  role_on_accept_in text,   -- 17B: new
  role_label_in text        -- 17B: new
)
returns void
language plpgsql security definer set search_path = public
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

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select admin_role into tier from club_admins
    where club_id = the_club_id and profile_id = auth.uid();

  if not (coalesce(is_super, false) or tier in ('lead', 'manager')) then
    raise exception 'Only lead, manager, or sysadmin can edit drives.'
      using errcode = '42501';
  end if;

  select recruitment_phase(drive_id_in) into phase;
  if phase = 'result' then
    raise exception 'Drive is locked in result phase.' using errcode = '22023';
  end if;

  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Drive name is required.' using errcode = '22023';
  end if;
  if array_length(target_years_in, 1) is null then
    raise exception 'At least one target year is required.' using errcode = '22023';
  end if;
  if interview_whatsapp_link_in is null or length(trim(interview_whatsapp_link_in)) = 0 then
    raise exception 'Interview WhatsApp link is required.' using errcode = '22023';
  end if;

  if role_on_accept_in is null or length(trim(role_on_accept_in)) = 0 then
    role_on_accept_in := 'volunteer';
  end if;

  update recruitments
     set name = trim(name_in),
         description = nullif(trim(coalesce(description_in, '')), ''),
         target_years = target_years_in,
         deadline = deadline_in,
         result_date = result_date_in,
         interview_whatsapp_link = trim(interview_whatsapp_link_in),
         community_whatsapp_link = nullif(trim(coalesce(community_whatsapp_link_in, '')), ''),
         role_on_accept = role_on_accept_in,
         role_label = nullif(trim(coalesce(role_label_in, '')), '')
   where id = drive_id_in;
end;
$$;

grant execute on function update_drive(
  uuid, text, text, int[], timestamptz, timestamptz, text, text, text, text
) to authenticated;


-- ---- 4) Update publish_recruitment_results to write role -----------------

create or replace function publish_recruitment_results(recruitment_id_in uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  the_club_id uuid;
  the_role text;
  the_role_label text;
  is_super boolean;
  is_lead boolean;
  pending_count int;
  members_added int := 0;
begin
  select club_id, role_on_accept, role_label
    into the_club_id, the_role, the_role_label
    from recruitments where id = recruitment_id_in;
  if the_club_id is null then
    raise exception 'Drive not found.' using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = the_club_id and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can publish results.' using errcode = '42501';
  end if;

  select count(*) into pending_count from applications
    where recruitment_id = recruitment_id_in and status in ('pending', 'reviewing');
  if pending_count > 0 then
    raise exception 'Cannot publish: % applications still pending or reviewing.', pending_count
      using errcode = '22023';
  end if;

  -- Materialize accepted applicants as members
  -- 17B: write role, role_label snapshot, source_recruitment_id
  insert into club_members (
    club_id, profile_id, joined_at,
    role, role_label, source_recruitment_id
  )
  select the_club_id, a.profile_id, now(),
         the_role, the_role_label, recruitment_id_in
    from applications a
   where a.recruitment_id = recruitment_id_in and a.status = 'accepted'
   on conflict (club_id, profile_id) do nothing;

  get diagnostics members_added = row_count;

  update recruitments
     set results_published_at = now(), results_published_by = auth.uid()
   where id = recruitment_id_in;

  insert into audit_log (actor_id, action, target_club_id, details)
  values (
    auth.uid(), 'publish_results', the_club_id,
    jsonb_build_object(
      'drive_id', recruitment_id_in,
      'members_added', members_added,
      'role', the_role
    )
  );
end;
$$;

grant execute on function publish_recruitment_results(uuid) to authenticated;


-- ---- 5) NEW: update_member_role ------------------------------------------

create or replace function update_member_role(
  club_id_in uuid,
  profile_id_in uuid,
  role_in text,
  role_label_in text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  is_super boolean;
  is_lead boolean;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = club_id_in and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can edit member roles.' using errcode = '42501';
  end if;

  if role_in not in ('volunteer', 'coordinator', 'core_coordinator', 'head_coordinator', 'overall_coordinator') then
    raise exception 'Invalid role: %', role_in using errcode = '22023';
  end if;

  update club_members
     set role = role_in,
         role_label = nullif(trim(coalesce(role_label_in, '')), '')
   where club_id = club_id_in and profile_id = profile_id_in;

  if not found then
    raise exception 'Member not found.' using errcode = '22023';
  end if;
end;
$$;

grant execute on function update_member_role(uuid, uuid, text, text) to authenticated;


-- ---- 6) NEW: toggle_member_exclude_from_promote --------------------------

create or replace function toggle_member_exclude_from_promote(
  club_id_in uuid,
  profile_id_in uuid,
  exclude_in boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  is_super boolean;
  is_lead boolean;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = club_id_in and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can toggle promotion exclusion.' using errcode = '42501';
  end if;

  update club_members
     set exclude_from_promote = exclude_in
   where club_id = club_id_in and profile_id = profile_id_in;

  if not found then
    raise exception 'Member not found.' using errcode = '22023';
  end if;
end;
$$;

grant execute on function toggle_member_exclude_from_promote(uuid, uuid, boolean) to authenticated;


-- ---- 7) NEW: bulk_promote_members ----------------------------------------
-- Accepts JSONB array: [{"profile_id": "uuid", "new_role": "coordinator"}, ...]
-- Atomically updates each member. Writes one audit_log entry summarising the run.

create or replace function bulk_promote_members(
  club_id_in uuid,
  member_selections jsonb
)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  is_super boolean;
  is_lead boolean;
  selection jsonb;
  promoted_count int := 0;
  target_profile_id uuid;
  target_new_role text;
begin
  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = club_id_in and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can bulk-promote members.' using errcode = '42501';
  end if;

  for selection in select * from jsonb_array_elements(member_selections)
  loop
    target_profile_id := (selection->>'profile_id')::uuid;
    target_new_role := selection->>'new_role';

    if target_new_role not in ('volunteer', 'coordinator', 'core_coordinator', 'head_coordinator', 'overall_coordinator') then
      raise exception 'Invalid role in selection: %', target_new_role using errcode = '22023';
    end if;

    update club_members
       set role = target_new_role,
           role_label = null  -- clear custom label on promotion; new role gets default
     where club_id = club_id_in and profile_id = target_profile_id;

    if found then
      promoted_count := promoted_count + 1;
    end if;
  end loop;

  insert into audit_log (actor_id, action, target_club_id, details)
  values (
    auth.uid(), 'bulk_promote_members', club_id_in,
    jsonb_build_object(
      'promoted_count', promoted_count,
      'selections', member_selections
    )
  );

  return promoted_count;
end;
$$;

grant execute on function bulk_promote_members(uuid, jsonb) to authenticated;


-- ---- Sanity checks (uncomment locally) -----------------------------------
-- select column_name, data_type from information_schema.columns
-- where table_name = 'club_members' and column_name in ('role', 'role_label', 'exclude_from_promote', 'source_recruitment_id');
-- Expected: 4 rows.
--
-- select column_name, data_type from information_schema.columns
-- where table_name = 'recruitments' and column_name in ('role_on_accept', 'role_label');
-- Expected: 2 rows.
