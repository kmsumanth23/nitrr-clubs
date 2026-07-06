-- =========================================================================
-- 16A — Drive RPCs (SECURITY DEFINER, authority-gated)
-- =========================================================================
-- All drive lifecycle actions go through these RPCs. Direct table writes are
-- blocked by RLS (drive_questions has no write policies; recruitments writes
-- happen via existing lead/manager auth path).
-- =========================================================================

-- ---- 1) create_drive ------------------------------------------------------
-- Creates a drive in DRAFT mode. Auto-populates 3 default questions.
-- Returns the new drive's id.

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

  -- Create drive (draft mode: published_at is null)
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

  -- Auto-populate 3 default questions
  insert into drive_questions (recruitment_id, prompt, sort_order, required)
  values
    (new_drive_id, 'Why do you want to join?', 0, true),
    (new_drive_id, 'Relevant experience or skills', 1, true),
    (new_drive_id, 'What can you contribute?', 2, false);

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


-- ---- 2) update_drive ------------------------------------------------------
-- Edit drive metadata. Blocked in review/result phase.

create or replace function update_drive(
  drive_id_in uuid,
  name_in text,
  description_in text,
  target_years_in int[],
  deadline_in timestamptz,
  result_date_in timestamptz
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
  if phase in ('review', 'result') then
    raise exception 'Drive is locked in % phase — cannot edit.', phase
      using errcode = '22023';
  end if;

  if name_in is null or length(trim(name_in)) = 0 then
    raise exception 'Drive name is required.' using errcode = '22023';
  end if;
  if array_length(target_years_in, 1) is null then
    raise exception 'At least one target year is required.' using errcode = '22023';
  end if;

  update recruitments
     set name = trim(name_in),
         description = nullif(trim(coalesce(description_in, '')), ''),
         target_years = target_years_in,
         deadline = deadline_in,
         result_date = result_date_in
   where id = drive_id_in;
end;
$$;

grant execute on function update_drive(uuid, text, text, int[], timestamptz, timestamptz) to authenticated;


-- ---- 3) publish_drive -----------------------------------------------------
-- Flip draft to published. Requires target_years non-empty + ≥1 question.

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
  question_count int;
begin
  select club_id, target_years, deadline
    into the_club_id, drive_target_years, drive_deadline
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

grant execute on function publish_drive(uuid) to authenticated;


-- ---- 4) delete_drive ------------------------------------------------------
-- Deletes a drive. Restrictions:
--   - Draft phase: always allowed
--   - Open phase: only if zero applications
--   - Review/Result phase: never allowed (use archival if needed later)

create or replace function delete_drive(drive_id_in uuid)
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
  app_count int;
begin
  select club_id into the_club_id from recruitments where id = drive_id_in;
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
    raise exception 'Only leads can delete drives.'
      using errcode = '42501';
  end if;

  select recruitment_phase(drive_id_in) into phase;

  if phase in ('review', 'result') then
    raise exception 'Cannot delete drive in % phase.', phase
      using errcode = '22023';
  end if;

  if phase = 'open' then
    select count(*) into app_count
      from applications where recruitment_id = drive_id_in;
    if app_count > 0 then
      raise exception 'Cannot delete open drive with % application(s).', app_count
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


-- ---- 5) add_drive_question ------------------------------------------------

create or replace function add_drive_question(
  drive_id_in uuid,
  prompt_in text,
  question_type_in text,
  required_in boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  the_club_id uuid;
  is_super boolean;
  tier text;
  phase text;
  next_order int;
  new_id uuid;
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
    raise exception 'Only lead, manager, or sysadmin can add questions.'
      using errcode = '42501';
  end if;

  select recruitment_phase(drive_id_in) into phase;
  if phase in ('review', 'result') then
    raise exception 'Cannot modify questions in % phase.', phase
      using errcode = '22023';
  end if;

  if prompt_in is null or length(trim(prompt_in)) = 0 then
    raise exception 'Question prompt is required.' using errcode = '22023';
  end if;
  if question_type_in not in ('short_text', 'long_text') then
    raise exception 'Invalid question type: %.', question_type_in
      using errcode = '22023';
  end if;

  select coalesce(max(sort_order), -1) + 1 into next_order
    from drive_questions where recruitment_id = drive_id_in;

  insert into drive_questions (
    recruitment_id, prompt, question_type, sort_order, required
  ) values (
    drive_id_in, trim(prompt_in), question_type_in, next_order,
    coalesce(required_in, true)
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function add_drive_question(uuid, text, text, boolean) to authenticated;


-- ---- 6) update_drive_question --------------------------------------------

create or replace function update_drive_question(
  question_id_in uuid,
  prompt_in text,
  question_type_in text,
  required_in boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_club_id uuid;
  the_drive_id uuid;
  is_super boolean;
  tier text;
  phase text;
begin
  select r.id, r.club_id into the_drive_id, the_club_id
    from drive_questions q
    join recruitments r on r.id = q.recruitment_id
   where q.id = question_id_in;
  if the_club_id is null then
    raise exception 'Question not found.' using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  select admin_role into tier from club_admins
    where club_id = the_club_id and profile_id = auth.uid();

  if not (coalesce(is_super, false) or tier in ('lead', 'manager')) then
    raise exception 'Only lead, manager, or sysadmin can edit questions.'
      using errcode = '42501';
  end if;

  select recruitment_phase(the_drive_id) into phase;
  if phase in ('review', 'result') then
    raise exception 'Cannot modify questions in % phase.', phase
      using errcode = '22023';
  end if;

  if prompt_in is null or length(trim(prompt_in)) = 0 then
    raise exception 'Question prompt is required.' using errcode = '22023';
  end if;
  if question_type_in not in ('short_text', 'long_text') then
    raise exception 'Invalid question type: %.', question_type_in
      using errcode = '22023';
  end if;

  update drive_questions
     set prompt = trim(prompt_in),
         question_type = question_type_in,
         required = coalesce(required_in, true)
   where id = question_id_in;
end;
$$;

grant execute on function update_drive_question(uuid, text, text, boolean) to authenticated;


-- ---- 7) delete_drive_question --------------------------------------------

create or replace function delete_drive_question(question_id_in uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_club_id uuid;
  the_drive_id uuid;
  is_super boolean;
  tier text;
  phase text;
  remaining int;
begin
  select r.id, r.club_id into the_drive_id, the_club_id
    from drive_questions q
    join recruitments r on r.id = q.recruitment_id
   where q.id = question_id_in;
  if the_club_id is null then
    raise exception 'Question not found.' using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  select admin_role into tier from club_admins
    where club_id = the_club_id and profile_id = auth.uid();

  if not (coalesce(is_super, false) or tier in ('lead', 'manager')) then
    raise exception 'Only lead, manager, or sysadmin can delete questions.'
      using errcode = '42501';
  end if;

  select recruitment_phase(the_drive_id) into phase;
  if phase in ('review', 'result') then
    raise exception 'Cannot delete questions in % phase.', phase
      using errcode = '22023';
  end if;

  -- Allow deleting to zero questions if drive is still draft
  -- (publish will re-check the question count).

  delete from drive_questions where id = question_id_in;
end;
$$;

grant execute on function delete_drive_question(uuid) to authenticated;


-- ---- 8) swap_drive_question_order ----------------------------------------

create or replace function swap_drive_question_order(
  question_a_in uuid,
  question_b_in uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_club_id uuid;
  the_drive_id uuid;
  drive_a uuid;
  drive_b uuid;
  is_super boolean;
  tier text;
  phase text;
  order_a int;
  order_b int;
begin
  select recruitment_id into drive_a from drive_questions where id = question_a_in;
  select recruitment_id into drive_b from drive_questions where id = question_b_in;
  if drive_a is null or drive_b is null then
    raise exception 'One or both questions not found.' using errcode = '22023';
  end if;
  if drive_a != drive_b then
    raise exception 'Cannot reorder questions across drives.' using errcode = '22023';
  end if;

  the_drive_id := drive_a;
  select club_id into the_club_id from recruitments where id = the_drive_id;

  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  select admin_role into tier from club_admins
    where club_id = the_club_id and profile_id = auth.uid();

  if not (coalesce(is_super, false) or tier in ('lead', 'manager')) then
    raise exception 'Only lead, manager, or sysadmin can reorder questions.'
      using errcode = '42501';
  end if;

  select recruitment_phase(the_drive_id) into phase;
  if phase in ('review', 'result') then
    raise exception 'Cannot reorder in % phase.', phase using errcode = '22023';
  end if;

  select sort_order into order_a from drive_questions where id = question_a_in;
  select sort_order into order_b from drive_questions where id = question_b_in;

  update drive_questions set sort_order = -1 where id = question_a_in;
  update drive_questions set sort_order = order_a where id = question_b_in;
  update drive_questions set sort_order = order_b where id = question_a_in;
end;
$$;

grant execute on function swap_drive_question_order(uuid, uuid) to authenticated;
