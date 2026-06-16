-- =============================================================================
-- 09g_sysadmin_more.sql
-- 12b: archived_at column, super_admin management, create club, decommission.
-- =============================================================================

-- 1) clubs.archived_at — soft-delete marker
alter table clubs
  add column if not exists archived_at timestamptz;

create index if not exists clubs_archived_at_idx
  on clubs(archived_at);

-- 2) set_super_admin — promote/demote sysadmin
create or replace function set_super_admin(
  profile_id_in uuid,
  value_in boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
  target_role text;
  remaining int;
begin
  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  if not coalesce(is_super, false) then
    raise exception 'Only a sysadmin can change sysadmin status.'
      using errcode = '42501';
  end if;

  select role into target_role from profiles where id = profile_id_in;
  if target_role is null then
    raise exception 'That profile does not exist.' using errcode = '22023';
  end if;

  if value_in then
    if target_role = 'super_admin' then
      raise exception 'Already a sysadmin.' using errcode = '22023';
    end if;
    update profiles set role = 'super_admin' where id = profile_id_in;
    insert into audit_log (actor_id, action, target_profile_id, details)
      values (auth.uid(), 'set_super_admin', profile_id_in,
              jsonb_build_object('value', true));
  else
    if target_role <> 'super_admin' then
      raise exception 'That profile is not a sysadmin.' using errcode = '22023';
    end if;
    -- Cannot demote self if last
    if profile_id_in = auth.uid() then
      select count(*) into remaining from profiles where role = 'super_admin';
      if remaining <= 1 then
        raise exception 'Cannot demote the only sysadmin. Promote another first.'
          using errcode = '22023';
      end if;
    end if;
    update profiles set role = 'student' where id = profile_id_in;
    insert into audit_log (actor_id, action, target_profile_id, details)
      values (auth.uid(), 'set_super_admin', profile_id_in,
              jsonb_build_object('value', false));
  end if;
end;
$$;
grant execute on function set_super_admin(uuid, boolean) to authenticated;

-- 3) create_club — sysadmin only; atomic club + initial lead
create or replace function create_club(
  name_in text,
  slug_in text,
  category_id_in uuid,
  initial_lead_profile_id_in uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
  new_id uuid;
begin
  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  if not coalesce(is_super, false) then
    raise exception 'Only a sysadmin can create clubs.' using errcode = '42501';
  end if;

  if length(trim(name_in)) < 2 then
    raise exception 'Club name must be at least 2 characters.' using errcode = '22023';
  end if;
  if length(trim(slug_in)) < 2 then
    raise exception 'Club slug must be at least 2 characters.' using errcode = '22023';
  end if;
  if slug_in !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' then
    raise exception 'Slug must be lowercase letters, numbers, and hyphens only.'
      using errcode = '22023';
  end if;
  if exists (select 1 from clubs where slug = slug_in) then
    raise exception 'A club with this slug already exists.' using errcode = '22023';
  end if;

  insert into clubs (slug, name, category_id, is_recruiting, updated_by)
    values (slug_in, name_in, category_id_in, false, auth.uid())
    returning id into new_id;

  insert into club_admins (club_id, profile_id, admin_role)
    values (new_id, initial_lead_profile_id_in, 'lead');

  insert into audit_log (actor_id, action, target_club_id, target_profile_id, details)
    values (auth.uid(), 'create_club', new_id, initial_lead_profile_id_in,
            jsonb_build_object('slug', slug_in, 'name', name_in));

  return new_id;
end;
$$;
grant execute on function create_club(text, text, uuid, uuid) to authenticated;

-- 4) decommission_club — sysadmin only
create or replace function decommission_club(club_id_in uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
begin
  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  if not coalesce(is_super, false) then
    raise exception 'Only a sysadmin can decommission clubs.'
      using errcode = '42501';
  end if;

  update clubs set archived_at = now() where id = club_id_in;

  insert into audit_log (actor_id, action, target_club_id, details)
    values (auth.uid(), 'decommission_club', club_id_in, null);
end;
$$;
grant execute on function decommission_club(uuid) to authenticated;

-- 5) restore_club — sysadmin only
create or replace function restore_club(club_id_in uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean;
begin
  select role = 'super_admin' into is_super
    from profiles where id = auth.uid();
  if not coalesce(is_super, false) then
    raise exception 'Only a sysadmin can restore clubs.'
      using errcode = '42501';
  end if;

  update clubs set archived_at = null where id = club_id_in;

  insert into audit_log (actor_id, action, target_club_id, details)
    values (auth.uid(), 'restore_club', club_id_in, null);
end;
$$;
grant execute on function restore_club(uuid) to authenticated;

-- 6) count_clubs_without_admins
create or replace function count_clubs_without_admins()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from clubs c
   where c.archived_at is null
     and not exists (
       select 1 from club_admins ca where ca.club_id = c.id
     );
$$;
grant execute on function count_clubs_without_admins() to authenticated;

-- 7) recruitments_overdue — review-phase past their result_date
create or replace function recruitments_overdue()
returns table (
  recruitment_id uuid,
  club_id uuid,
  club_slug text,
  club_name text,
  recruitment_name text,
  result_date timestamptz,
  days_overdue int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.club_id,
    c.slug,
    c.name,
    r.name,
    r.result_date,
    extract(day from (now() - r.result_date))::int
  from recruitments r
  join clubs c on c.id = r.club_id
  where c.archived_at is null
    and r.results_published_at is null
    and r.result_date is not null
    and r.result_date < now()
    and r.deadline < now()  -- past deadline = at least review phase
  order by r.result_date asc;
$$;
grant execute on function recruitments_overdue() to authenticated;
