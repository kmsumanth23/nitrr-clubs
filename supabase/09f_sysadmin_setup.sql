-- =============================================================================
-- 09f_sysadmin_setup.sql
-- Per-club admin management (12a). Schema + functions + RLS updates.
-- =============================================================================

-- 1) Audit log: append-only record of admin actions
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,             -- e.g. 'add_club_admin', 'create_club'
  target_club_id uuid references clubs(id),
  target_profile_id uuid references profiles(id),
  details jsonb,                    -- tier, slug, etc.
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_at_idx
  on audit_log(created_at desc);
create index if not exists audit_log_target_club_idx
  on audit_log(target_club_id, created_at desc);

alter table audit_log enable row level security;

-- Sysadmin can read all audit entries; lead+ can read entries about their clubs
drop policy if exists "audit_log: sysadmin read all" on audit_log;
create policy "audit_log: sysadmin read all" on audit_log
  for select using (is_super_admin());

drop policy if exists "audit_log: lead read own club" on audit_log;
create policy "audit_log: lead read own club" on audit_log
  for select using (
    target_club_id is not null
    and exists (
      select 1 from club_admins
       where club_id = target_club_id
         and profile_id = auth.uid()
         and admin_role in ('lead', 'manager')
    )
  );

grant select on audit_log to authenticated;
-- inserts are made by SECURITY DEFINER functions only; no direct write grant

-- 2) Profile search RLS — lead+ and sysadmin can search all profiles
--    by name/email/roll for admin assignment.
drop policy if exists "profiles: lead+ search" on profiles;
create policy "profiles: lead+ search" on profiles
  for select using (
    is_super_admin()
    or exists (
      select 1 from club_admins
       where profile_id = auth.uid()
         and admin_role in ('lead', 'manager')
    )
  );

-- 3) Helper: can manage admins of a club (lead of that club OR sysadmin)
create or replace function can_manage_club_admins(club_id_in uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    is_super_admin()
    or exists (
      select 1 from club_admins
       where club_id = club_id_in
         and profile_id = auth.uid()
         and admin_role = 'lead'
    );
$$;
grant execute on function can_manage_club_admins(uuid) to authenticated;

-- 4) add_club_admin
create or replace function add_club_admin(
  club_id_in uuid,
  profile_id_in uuid,
  tier_in text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  can_manage boolean;
begin
  if tier_in not in ('lead', 'manager', 'editor') then
    raise exception 'Invalid tier: %', tier_in using errcode = '22023';
  end if;

  select can_manage_club_admins(club_id_in) into can_manage;
  if not coalesce(can_manage, false) then
    raise exception 'Only the club lead or sysadmin can manage admins.'
      using errcode = '42501';
  end if;

  -- Reject duplicates explicitly with a friendly message (the unique
  -- constraint would do this too, but with a less helpful error).
  if exists (
    select 1 from club_admins
     where club_id = club_id_in and profile_id = profile_id_in
  ) then
    raise exception 'This person is already an admin of this club.'
      using errcode = '22023';
  end if;

  insert into club_admins (club_id, profile_id, admin_role)
    values (club_id_in, profile_id_in, tier_in::admin_tier);

  insert into audit_log (actor_id, action, target_club_id, target_profile_id, details)
    values (auth.uid(), 'add_club_admin', club_id_in, profile_id_in,
            jsonb_build_object('tier', tier_in));
end;
$$;
grant execute on function add_club_admin(uuid, uuid, text) to authenticated;

-- 5) remove_club_admin
create or replace function remove_club_admin(
  club_id_in uuid,
  profile_id_in uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  can_manage boolean;
  removed_tier text;
  remaining_leads int;
begin
  select can_manage_club_admins(club_id_in) into can_manage;
  if not coalesce(can_manage, false) then
    raise exception 'Only the club lead or sysadmin can manage admins.'
      using errcode = '42501';
  end if;

  select admin_role::text into removed_tier
    from club_admins
   where club_id = club_id_in and profile_id = profile_id_in;

  if removed_tier is null then
    raise exception 'That admin does not exist on this club.'
      using errcode = '22023';
  end if;

  -- Last-lead protection: can't remove the only lead
  if removed_tier = 'lead' then
    select count(*) into remaining_leads
      from club_admins
     where club_id = club_id_in and admin_role = 'lead';
    if remaining_leads <= 1 then
      raise exception 'Cannot remove the only lead. Promote someone else first.'
        using errcode = '22023';
    end if;
  end if;

  delete from club_admins
   where club_id = club_id_in and profile_id = profile_id_in;

  insert into audit_log (actor_id, action, target_club_id, target_profile_id, details)
    values (auth.uid(), 'remove_club_admin', club_id_in, profile_id_in,
            jsonb_build_object('tier', removed_tier));
end;
$$;
grant execute on function remove_club_admin(uuid, uuid) to authenticated;

-- 6) change_club_admin_tier
create or replace function change_club_admin_tier(
  club_id_in uuid,
  profile_id_in uuid,
  new_tier_in text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  can_manage boolean;
  current_tier text;
  remaining_leads int;
begin
  if new_tier_in not in ('lead', 'manager', 'editor') then
    raise exception 'Invalid tier: %', new_tier_in using errcode = '22023';
  end if;

  select can_manage_club_admins(club_id_in) into can_manage;
  if not coalesce(can_manage, false) then
    raise exception 'Only the club lead or sysadmin can manage admins.'
      using errcode = '42501';
  end if;

  select admin_role::text into current_tier
    from club_admins
   where club_id = club_id_in and profile_id = profile_id_in;

  if current_tier is null then
    raise exception 'That admin does not exist on this club.'
      using errcode = '22023';
  end if;

  if current_tier = new_tier_in then
    return; -- no-op
  end if;

  -- Last-lead protection: can't demote the only lead
  if current_tier = 'lead' and new_tier_in != 'lead' then
    select count(*) into remaining_leads
      from club_admins
     where club_id = club_id_in and admin_role = 'lead';
    if remaining_leads <= 1 then
      raise exception 'Cannot demote the only lead. Promote someone else to lead first.'
        using errcode = '22023';
    end if;
  end if;

  update club_admins
     set admin_role = new_tier_in::admin_tier
   where club_id = club_id_in and profile_id = profile_id_in;

  insert into audit_log (actor_id, action, target_club_id, target_profile_id, details)
    values (auth.uid(), 'change_club_admin_tier', club_id_in, profile_id_in,
            jsonb_build_object('from', current_tier, 'to', new_tier_in));
end;
$$;
grant execute on function change_club_admin_tier(uuid, uuid, text) to authenticated;
