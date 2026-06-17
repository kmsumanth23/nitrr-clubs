-- =============================================================================
-- 09h_audit_more.sql
-- 12c: add audit_log writes to publish_recruitment_results + remove_member.
-- Adds Members category to the audit log viewer.
-- =============================================================================

-- 1) Patch remove_member to write audit_log
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
  is_lead boolean;
  app_id uuid;
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
    raise exception 'Only the club lead or sysadmin can remove members.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from club_members
     where club_id = club_id_in and profile_id = profile_id_in
  ) then
    raise exception 'That person is not a member of this club.'
      using errcode = '22023';
  end if;

  -- Bypass the phase-check trigger for the application flip
  perform set_config('app.bypass_phase_check', 'true', true);

  delete from club_members
   where club_id = club_id_in and profile_id = profile_id_in;

  -- Flip their accepted application to 'removed' (the one from the latest
  -- recruitment they were accepted into)
  select a.id into app_id
    from applications a
    join recruitments r on r.id = a.recruitment_id
   where a.club_id = club_id_in
     and a.profile_id = profile_id_in
     and a.status = 'accepted'
     and r.results_published_at is not null
   order by a.created_at desc
   limit 1;

  if app_id is not null then
    update applications set status = 'removed' where id = app_id;
  end if;

  -- Audit log entry
  insert into audit_log (actor_id, action, target_club_id, target_profile_id, details)
    values (auth.uid(), 'remove_member', club_id_in, profile_id_in,
            jsonb_build_object('application_id', app_id));
end;
$$;
grant execute on function remove_member(uuid, uuid) to authenticated;

-- 2) Patch publish_recruitment_results to write audit_log
create or replace function publish_recruitment_results(recruitment_id_in uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
  is_lead boolean;
  rec_record recruitments%rowtype;
  pending_count int;
  accepted_count int;
begin
  select * into rec_record from recruitments where id = recruitment_id_in;
  if rec_record.id is null then
    raise exception 'Recruitment not found.' using errcode = '22023';
  end if;
  if rec_record.results_published_at is not null then
    raise exception 'Results already published for this recruitment.'
      using errcode = '22023';
  end if;

  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  select exists (
    select 1 from club_admins
    where club_id = rec_record.club_id
      and profile_id = auth.uid()
      and admin_role = 'lead'
  ) into is_lead;

  if not (coalesce(is_super, false) or coalesce(is_lead, false)) then
    raise exception 'Only the club lead or sysadmin can publish results.'
      using errcode = '42501';
  end if;

  -- Must have zero pending/reviewing
  select count(*) into pending_count
    from applications
   where recruitment_id = recruitment_id_in
     and status in ('pending', 'reviewing');
  if pending_count > 0 then
    raise exception '% application(s) are still pending or being reviewed.', pending_count
      using errcode = '22023';
  end if;

  -- Materialize accepted apps into club_members (skip if already a member)
  insert into club_members (club_id, profile_id, joined_at)
    select rec_record.club_id, a.profile_id, now()
      from applications a
     where a.recruitment_id = recruitment_id_in
       and a.status = 'accepted'
       and not exists (
         select 1 from club_members cm
          where cm.club_id = rec_record.club_id
            and cm.profile_id = a.profile_id
       );

  select count(*) into accepted_count
    from applications
   where recruitment_id = recruitment_id_in
     and status = 'accepted';

  update recruitments
     set results_published_at = now(),
         results_published_by = auth.uid()
   where id = recruitment_id_in;

  -- Audit log entry
  insert into audit_log (actor_id, action, target_club_id, details)
    values (auth.uid(), 'publish_results', rec_record.club_id,
            jsonb_build_object(
              'recruitment_id', recruitment_id_in,
              'recruitment_name', rec_record.name,
              'members_added', accepted_count
            ));
end;
$$;
grant execute on function publish_recruitment_results(uuid) to authenticated;
