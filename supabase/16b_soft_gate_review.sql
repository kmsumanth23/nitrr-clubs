-- 16B addendum: soft-gate drive edits during review phase.
--
-- Previously `update_drive` blocked review + result phases. In practice a lead
-- may need to extend the deadline (bringing the drive back to Open) or fix a
-- typo in the description while review is running. Only `result` — the
-- terminal, results-published state — should be truly frozen.
--
-- Question CRUD stays locked in review (add/update/delete/swap_drive_question)
-- because students have already answered them; changing prompts mid-review
-- would break the read side.

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
  -- Soft gate: only `result` is frozen; review remains editable so leads can
  -- extend the deadline (rolling the drive back to open).
  if phase = 'result' then
    raise exception 'Results published — this drive is frozen.'
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
