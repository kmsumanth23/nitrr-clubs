-- =========================================================================
-- 17C — Departments per drive + ranked preferences + placement UI
-- =========================================================================
-- Adds departments to drives (optional, per drive). Students rank preferences
-- at apply time (up to max_department_choices). Admin decides placement at
-- accept-time (defaults to student's 1st preference; can override to any dept).
-- Post-accept placement changes allowed in all phases.
--
-- Department mutability policy (Q5 → C):
--   Draft:  add / edit name / edit link / delete / reorder — all allowed
--   Open+Review: name + link edits only; add/delete/reorder blocked
--   Result: community link edits only (mirrors 17A carve-out)
--
-- All grants co-located per Lesson 16.
-- =========================================================================


-- ---- 1) Schema additions ------------------------------------------------

-- New table for departments
create table if not exists drive_departments (
  id                       uuid primary key default gen_random_uuid(),
  recruitment_id           uuid not null references recruitments(id) on delete cascade,
  name                     text not null,
  community_whatsapp_link  text null,
  sort_order               int  not null default 0,
  created_at               timestamptz not null default now(),
  unique (recruitment_id, name)
);

create index if not exists drive_departments_recruitment_idx
  on drive_departments(recruitment_id, sort_order);

alter table drive_departments enable row level security;

-- Public read (departments are shown on public apply page)
drop policy if exists "drive_departments: public read" on drive_departments;
create policy "drive_departments: public read" on drive_departments
  for select using (true);

-- No direct writes — all mutations go through RPCs
grant select on drive_departments to anon, authenticated;

-- Max ranked-preference choices per drive
alter table recruitments
  add column if not exists max_department_choices int not null default 2
    check (max_department_choices between 1 and 6);

-- Applicant's ranked prefs + admin's placement decision
alter table applications
  add column if not exists preferred_departments uuid[] null;

alter table applications
  add column if not exists accepted_department_id uuid null
    references drive_departments(id) on delete restrict;

-- Denormalized on club_members for cheap community-link resolution
alter table club_members
  add column if not exists accepted_department_id uuid null
    references drive_departments(id) on delete set null;


-- ---- 2) Extend create_drive with max_department_choices ------------------

drop function if exists create_drive(uuid, text, text, int[], timestamptz, timestamptz, text, text, text, text);

create or replace function create_drive(
  club_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text,
  community_whatsapp_link_in text,
  role_on_accept_in text,
  role_label_in text,
  max_department_choices_in int   -- 17C: new
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

  if role_on_accept_in is null or length(trim(role_on_accept_in)) = 0 then
    role_on_accept_in := 'volunteer';
  end if;

  -- 17C: clamp max_department_choices to 1-6, default 2
  if max_department_choices_in is null or max_department_choices_in < 1 or max_department_choices_in > 6 then
    max_department_choices_in := 2;
  end if;

  insert into recruitments (
    club_id, name, description, target_years,
    deadline, result_date,
    interview_whatsapp_link, community_whatsapp_link,
    role_on_accept, role_label,
    max_department_choices,
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
    max_department_choices_in,
    auth.uid(), null
  )
  returning id into new_drive_id;

  insert into audit_log (actor_id, action, target_club_id, details)
  values (
    auth.uid(), 'create_drive', club_id_in,
    jsonb_build_object(
      'drive_id', new_drive_id, 'name', name_in,
      'target_years', target_years_in,
      'role_on_accept', role_on_accept_in,
      'max_department_choices', max_department_choices_in
    )
  );

  return new_drive_id;
end;
$$;

grant execute on function create_drive(
  uuid, text, text, int[], timestamptz, timestamptz,
  text, text, text, text, int
) to authenticated;


-- ---- 3) Extend update_drive with max_department_choices ------------------
--
-- Following 17B addendum 1 pattern: null/empty params for role fields
-- preserve existing values (defensive against interstitial UI state where
-- the field isn't yet rendered). max_department_choices follows same rule.
--
-- Phase gate matches 17B (result phase blocked). Q5-C means departments
-- have their own dedicated RPCs; this covers only recruitments-level fields.

drop function if exists update_drive(uuid, text, text, int[], timestamptz, timestamptz, text, text, text, text);

create or replace function update_drive(
  drive_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz,
  interview_whatsapp_link_in text,
  community_whatsapp_link_in text,
  role_on_accept_in text,
  role_label_in text,
  max_department_choices_in int  -- 17C: new
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

  update recruitments
     set name = trim(name_in),
         description = nullif(trim(coalesce(description_in, '')), ''),
         target_years = target_years_in,
         deadline = deadline_in,
         result_date = result_date_in,
         interview_whatsapp_link = trim(interview_whatsapp_link_in),
         community_whatsapp_link = nullif(trim(coalesce(community_whatsapp_link_in, '')), ''),
         -- Preserve role_on_accept when null/empty (17B addendum 1 pattern)
         role_on_accept = coalesce(
           nullif(trim(coalesce(role_on_accept_in, '')), ''),
           role_on_accept
         ),
         role_label = case
           when role_label_in is null then role_label
           else nullif(trim(role_label_in), '')
         end,
         -- 17C: preserve max_department_choices when null/invalid
         max_department_choices = case
           when max_department_choices_in is null then max_department_choices
           when max_department_choices_in < 1 then max_department_choices
           when max_department_choices_in > 6 then max_department_choices
           else max_department_choices_in
         end
   where id = drive_id_in;
end;
$$;

grant execute on function update_drive(
  uuid, text, text, int[], timestamptz, timestamptz,
  text, text, text, text, int
) to authenticated;


-- ---- 4) Update publish_recruitment_results — gate on placement + write denorm

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
  drive_has_departments boolean;
  unplaced_count int;
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

  -- 17C: if drive has departments, every accepted app must have a placement
  select exists (select 1 from drive_departments where recruitment_id = recruitment_id_in)
    into drive_has_departments;

  if drive_has_departments then
    select count(*) into unplaced_count from applications
      where recruitment_id = recruitment_id_in
        and status = 'accepted'
        and accepted_department_id is null;

    if unplaced_count > 0 then
      raise exception 'Cannot publish: % accepted applications have no department placement. Assign a department to every accepted student first.', unplaced_count
        using errcode = '22023';
    end if;
  end if;

  -- Materialize accepted applicants as members
  -- 17B: writes role, role_label, source_recruitment_id
  -- 17C: also writes accepted_department_id from application
  insert into club_members (
    club_id, profile_id, joined_at,
    role, role_label, source_recruitment_id,
    accepted_department_id
  )
  select the_club_id, a.profile_id, now(),
         the_role, the_role_label, recruitment_id_in,
         a.accepted_department_id
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
      'role', the_role,
      'had_departments', drive_has_departments
    )
  );
end;
$$;

grant execute on function publish_recruitment_results(uuid) to authenticated;


-- ---- 5) NEW: add_drive_department (DRAFT ONLY) ---------------------------

create or replace function add_drive_department(
  drive_id_in uuid,
  name_in text,
  community_whatsapp_link_in text
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  the_club_id uuid;
  is_super boolean;
  tier text;
  phase text;
  new_dept_id uuid;
  next_sort int;
begin
  select club_id into the_club_id from recruitments where id = drive_id_in;
  if the_club_id is null then
    raise exception 'Drive not found.' using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select admin_role into tier from club_admins
    where club_id = the_club_id and profile_id = auth.uid();

  if not (coalesce(is_super, false) or tier in ('lead', 'manager')) then
    raise exception 'Only lead, manager, or sysadmin can add departments.'
      using errcode = '42501';
  end if;

  -- Q5 → C: structural changes are draft-only
  select recruitment_phase(drive_id_in) into phase;
  if phase != 'draft' then
    raise exception 'Departments can only be added in draft phase.'
      using errcode = '22023';
  end if;

  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Department name is required.' using errcode = '22023';
  end if;

  select coalesce(max(sort_order), -1) + 1 into next_sort
    from drive_departments where recruitment_id = drive_id_in;

  insert into drive_departments (
    recruitment_id, name, community_whatsapp_link, sort_order
  ) values (
    drive_id_in, trim(name_in),
    nullif(trim(coalesce(community_whatsapp_link_in, '')), ''),
    next_sort
  )
  returning id into new_dept_id;

  return new_dept_id;
end;
$$;

grant execute on function add_drive_department(uuid, text, text) to authenticated;


-- ---- 6) NEW: update_drive_department (ALL PHASES — name + link only) -----

create or replace function update_drive_department(
  department_id_in uuid,
  name_in text,
  community_whatsapp_link_in text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  the_recruitment_id uuid;
  the_club_id uuid;
  is_super boolean;
  tier text;
begin
  select recruitment_id into the_recruitment_id
    from drive_departments where id = department_id_in;
  if the_recruitment_id is null then
    raise exception 'Department not found.' using errcode = '22023';
  end if;

  select club_id into the_club_id from recruitments where id = the_recruitment_id;

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select admin_role into tier from club_admins
    where club_id = the_club_id and profile_id = auth.uid();

  if not (coalesce(is_super, false) or tier in ('lead', 'manager')) then
    raise exception 'Only lead, manager, or sysadmin can edit departments.'
      using errcode = '42501';
  end if;

  -- All phases allowed — name/link edits don't affect student choice fairness

  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Department name is required.' using errcode = '22023';
  end if;

  update drive_departments
     set name = trim(name_in),
         community_whatsapp_link = nullif(trim(coalesce(community_whatsapp_link_in, '')), '')
   where id = department_id_in;
end;
$$;

grant execute on function update_drive_department(uuid, text, text) to authenticated;


-- ---- 7) NEW: delete_drive_department (DRAFT ONLY, renormalize prefs) -----

create or replace function delete_drive_department(department_id_in uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  the_recruitment_id uuid;
  the_club_id uuid;
  is_super boolean;
  is_lead boolean;
  phase text;
  placed_count int;
begin
  select recruitment_id into the_recruitment_id
    from drive_departments where id = department_id_in;
  if the_recruitment_id is null then
    raise exception 'Department not found.' using errcode = '22023';
  end if;

  select club_id into the_club_id from recruitments where id = the_recruitment_id;

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = the_club_id and profile_id = auth.uid() and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only leads can delete departments.'
      using errcode = '42501';
  end if;

  -- Q5 → C: draft only for structural deletes
  select recruitment_phase(the_recruitment_id) into phase;
  if phase != 'draft' then
    raise exception 'Departments can only be deleted in draft phase.'
      using errcode = '22023';
  end if;

  -- Q2 modified B: block if any application is placed here
  select count(*) into placed_count from applications
    where accepted_department_id = department_id_in;
  if placed_count > 0 then
    raise exception 'Cannot delete: % accepted applications are placed in this department.', placed_count
      using errcode = '22023';
  end if;

  -- Q2 modified B: renormalize preferred_departments — strip UUID from arrays
  update applications
     set preferred_departments = array_remove(preferred_departments, department_id_in)
   where recruitment_id = the_recruitment_id
     and department_id_in = any(preferred_departments);

  delete from drive_departments where id = department_id_in;
end;
$$;

grant execute on function delete_drive_department(uuid) to authenticated;


-- ---- 8) NEW: swap_drive_department_order (DRAFT ONLY) --------------------

create or replace function swap_drive_department_order(
  id_a_in uuid,
  id_b_in uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  rec_a uuid;
  rec_b uuid;
  the_club_id uuid;
  is_super boolean;
  tier text;
  phase text;
  sort_a int;
  sort_b int;
begin
  select recruitment_id, sort_order into rec_a, sort_a
    from drive_departments where id = id_a_in;
  select recruitment_id, sort_order into rec_b, sort_b
    from drive_departments where id = id_b_in;

  if rec_a is null or rec_b is null then
    raise exception 'Department not found.' using errcode = '22023';
  end if;
  if rec_a != rec_b then
    raise exception 'Departments must belong to the same drive.' using errcode = '22023';
  end if;

  select club_id into the_club_id from recruitments where id = rec_a;

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select admin_role into tier from club_admins
    where club_id = the_club_id and profile_id = auth.uid();

  if not (coalesce(is_super, false) or tier in ('lead', 'manager')) then
    raise exception 'Only lead, manager, or sysadmin can reorder departments.'
      using errcode = '42501';
  end if;

  select recruitment_phase(rec_a) into phase;
  if phase != 'draft' then
    raise exception 'Departments can only be reordered in draft phase.'
      using errcode = '22023';
  end if;

  update drive_departments set sort_order = sort_b where id = id_a_in;
  update drive_departments set sort_order = sort_a where id = id_b_in;
end;
$$;

grant execute on function swap_drive_department_order(uuid, uuid) to authenticated;


-- ---- 9) NEW: set_accepted_department (ALL PHASES) ------------------------
-- Syncs to club_members if the member already exists (post-publish edits).

create or replace function set_accepted_department(
  application_id_in uuid,
  department_id_in uuid  -- null clears placement
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  the_recruitment_id uuid;
  the_club_id uuid;
  the_profile_id uuid;
  the_status text;
  dept_recruitment_id uuid;
  is_super boolean;
  tier text;
begin
  select recruitment_id, profile_id, status
    into the_recruitment_id, the_profile_id, the_status
    from applications where id = application_id_in;
  if the_recruitment_id is null then
    raise exception 'Application not found.' using errcode = '22023';
  end if;

  select club_id into the_club_id from recruitments where id = the_recruitment_id;

  select role = 'super_admin' into is_super from profiles where id = auth.uid();
  select admin_role into tier from club_admins
    where club_id = the_club_id and profile_id = auth.uid();

  if not (coalesce(is_super, false) or tier in ('lead', 'manager')) then
    raise exception 'Only lead, manager, or sysadmin can set department placement.'
      using errcode = '42501';
  end if;

  -- Validate department belongs to this drive (if department_id is provided)
  if department_id_in is not null then
    select recruitment_id into dept_recruitment_id
      from drive_departments where id = department_id_in;
    if dept_recruitment_id is null then
      raise exception 'Department not found.' using errcode = '22023';
    end if;
    if dept_recruitment_id != the_recruitment_id then
      raise exception 'Department does not belong to this drive.' using errcode = '22023';
    end if;
  end if;

  -- Update application
  update applications
     set accepted_department_id = department_id_in
   where id = application_id_in;

  -- Sync to club_members if member exists (post-publish edit case)
  update club_members
     set accepted_department_id = department_id_in
   where club_id = the_club_id and profile_id = the_profile_id;

  insert into audit_log (actor_id, action, target_club_id, target_profile_id, details)
  values (
    auth.uid(), 'set_accepted_department', the_club_id, the_profile_id,
    jsonb_build_object(
      'application_id', application_id_in,
      'department_id', department_id_in,
      'drive_id', the_recruitment_id
    )
  );
end;
$$;

grant execute on function set_accepted_department(uuid, uuid) to authenticated;


-- =========================================================================
-- Sanity checks (uncomment locally)
-- =========================================================================
--
-- -- Verify new table and columns
-- select column_name, data_type from information_schema.columns
-- where table_name = 'drive_departments';
-- -- Expected: 6 rows
--
-- select column_name, data_type from information_schema.columns
-- where table_name = 'applications' and column_name in ('preferred_departments', 'accepted_department_id');
-- -- Expected: 2 rows
--
-- select column_name, data_type from information_schema.columns
-- where table_name = 'club_members' and column_name = 'accepted_department_id';
-- -- Expected: 1 row
--
-- select column_name, data_type from information_schema.columns
-- where table_name = 'recruitments' and column_name = 'max_department_choices';
-- -- Expected: 1 row
--
-- -- Verify all 5 new RPCs exist
-- select routine_name from information_schema.routines
-- where routine_name in (
--   'add_drive_department', 'update_drive_department',
--   'delete_drive_department', 'swap_drive_department_order',
--   'set_accepted_department'
-- );
-- -- Expected: 5 rows
--
-- -- Verify grants
-- select routine_name, grantee, privilege_type
-- from information_schema.routine_privileges
-- where routine_name in (
--   'add_drive_department', 'update_drive_department',
--   'delete_drive_department', 'swap_drive_department_order',
--   'set_accepted_department', 'create_drive', 'update_drive'
-- )
-- and grantee = 'authenticated';
-- -- Expected: 7 rows (one per RPC with authenticated grantee)
