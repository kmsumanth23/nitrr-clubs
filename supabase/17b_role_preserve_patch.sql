-- =========================================================================
-- 17B addendum — preserve role fields when update_drive caller omits them
-- =========================================================================
-- Between Batch 1 and Batch 2, the drive editor doesn't render the role
-- dropdown, so any `Save changes` submit sends no `roleOnAccept` field.
-- The action defaults to 'volunteer' via Zod, and update_drive faithfully
-- writes it — clobbering whatever the drive previously had.
--
-- Fix: treat null/empty caller input as "no change" instead of "default to
-- volunteer". Same treatment for role_label. `create_drive` keeps its
-- default-to-volunteer behavior (no prior value to preserve).
-- =========================================================================

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
  role_label_in text
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
         -- 17B: preserve on null/empty. Batch 2 always sends an explicit role
         -- via the drive-editor dropdown; interstitial callers (no role field
         -- in the form) don't clobber anymore.
         role_on_accept =
           coalesce(nullif(trim(coalesce(role_on_accept_in, '')), ''), role_on_accept),
         -- role_label: null caller = preserve; empty string = explicit clear.
         role_label = case
                        when role_label_in is null then role_label
                        else nullif(trim(role_label_in), '')
                      end
   where id = drive_id_in;
end;
$$;

grant execute on function update_drive(
  uuid, text, text, int[], timestamptz, timestamptz, text, text, text, text
) to authenticated;
