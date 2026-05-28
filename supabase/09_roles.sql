-- ============================================================
-- NITRR Clubs — 09_roles.sql
-- Role-model migration locked in for 9a–9e:
--   * club_members table (roster)
--   * tier-aware RLS helpers (lead / manager / editor)
--   * updated_by audit on clubs + events
--   * trigger: block self-apply (admin or member of the club)
--   * trigger: protect "at least one lead per club" invariant
-- Safe to re-run.
-- ============================================================

-- ---------- club_members (the roster) ----------
create table if not exists club_members (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  unique (club_id, profile_id)
);
create index if not exists idx_club_members_club    on club_members(club_id);
create index if not exists idx_club_members_profile on club_members(profile_id);

alter table club_members enable row level security;

drop policy if exists "members: public read" on club_members;
create policy "members: public read"
  on club_members for select using (true);

-- Writes happen via the accept-application action (server-side, service role
-- normally, but here via SECURITY DEFINER in the trigger). For now allow
-- club admins of the same club to insert/delete directly:
drop policy if exists "members: admin write" on club_members;
create policy "members: admin write"
  on club_members for all
  using (
    is_super_admin() or exists (
      select 1 from club_admins
      where club_id = club_members.club_id and profile_id = auth.uid()
    )
  )
  with check (
    is_super_admin() or exists (
      select 1 from club_admins
      where club_id = club_members.club_id and profile_id = auth.uid()
    )
  );

grant select on club_members to anon, authenticated;
grant insert, update, delete on club_members to authenticated;

-- ---------- updated_by audit on clubs + events ----------
alter table clubs  add column if not exists updated_by uuid references profiles(id);
alter table events add column if not exists updated_by uuid references profiles(id);

-- ---------- tier-aware helpers (replace single is_club_admin) ----------
-- Return the tier ('lead' | 'manager' | 'editor') the current user has on
-- a given club, or null if none.
create or replace function club_tier(target_club uuid)
returns text language sql security definer stable set search_path = public as $$
  select admin_role from club_admins
  where club_id = target_club and profile_id = auth.uid()
  limit 1;
$$;

-- editor+ can edit content (club info, events, gallery, team)
create or replace function can_edit_club_content(target_club uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select club_tier(target_club) in ('editor','manager','lead') or is_super_admin();
$$;

-- manager+ can review applications (editor cannot)
create or replace function can_manage_applications(target_club uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select club_tier(target_club) in ('manager','lead') or is_super_admin();
$$;

-- lead can add/remove admins for their club
create or replace function can_manage_admins(target_club uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select club_tier(target_club) = 'lead' or is_super_admin();
$$;

-- Keep the old name working for any callers we haven't migrated yet:
create or replace function is_club_admin(target_club uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select can_edit_club_content(target_club);
$$;

-- ---------- update RLS policies to use the tier helpers ----------
-- Content tables: editor+ can write
drop policy if exists "clubs: admin update" on clubs;
create policy "clubs: admin update"
  on clubs for update
  using (can_edit_club_content(id))
  with check (can_edit_club_content(id));

drop policy if exists "club_team: admin write" on club_team;
create policy "club_team: admin write"
  on club_team for all
  using (can_edit_club_content(club_id))
  with check (can_edit_club_content(club_id));

drop policy if exists "events: admin write" on events;
create policy "events: admin write"
  on events for all
  using (can_edit_club_content(club_id))
  with check (can_edit_club_content(club_id));

drop policy if exists "gallery: admin write" on gallery_photos;
create policy "gallery: admin write"
  on gallery_photos for all
  using (can_edit_club_content(club_id))
  with check (can_edit_club_content(club_id));

-- Applications: manager+ can read/update for their club (editor cannot)
drop policy if exists "applications: admin read club" on applications;
create policy "applications: admin read club"
  on applications for select
  using (can_manage_applications(club_id));

drop policy if exists "applications: admin update club" on applications;
create policy "applications: admin update club"
  on applications for update
  using (can_manage_applications(club_id))
  with check (can_manage_applications(club_id));

-- club_admins: only leads (or super_admin) can manage their club's admins.
drop policy if exists "club_admins: super_admin write" on club_admins;
create policy "club_admins: lead write"
  on club_admins for all
  using (can_manage_admins(club_id))
  with check (can_manage_admins(club_id));

-- ---------- TRIGGER: block self-apply ----------
-- A student cannot apply to a club they admin OR are already a member of.
create or replace function block_self_apply()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from club_admins
    where club_id = new.club_id and profile_id = new.profile_id
  ) then
    raise exception 'You manage this club and cannot apply to it.'
      using errcode = 'P0001';
  end if;
  if exists (
    select 1 from club_members
    where club_id = new.club_id and profile_id = new.profile_id
  ) then
    raise exception 'You are already a member of this club.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_block_self_apply on applications;
create trigger trg_block_self_apply
  before insert on applications
  for each row execute function block_self_apply();

-- ---------- TRIGGER: protect "≥1 lead per club" ----------
-- Prevent deleting or demoting the last lead. Super_admin must remove the
-- whole club instead (handover/decommission flow).
create or replace function protect_last_lead()
returns trigger language plpgsql as $$
declare
  remaining_leads int;
begin
  if (tg_op = 'DELETE' and old.admin_role = 'lead')
     or (tg_op = 'UPDATE' and old.admin_role = 'lead' and new.admin_role <> 'lead')
  then
    select count(*) into remaining_leads
    from club_admins
    where club_id = old.club_id
      and admin_role = 'lead'
      and id <> old.id;
    if remaining_leads = 0 then
      raise exception
        'Cannot remove or demote the last lead of this club. Assign another lead first, or ask a super_admin to decommission the club.'
        using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_protect_last_lead on club_admins;
create trigger trg_protect_last_lead
  before update or delete on club_admins
  for each row execute function protect_last_lead();
