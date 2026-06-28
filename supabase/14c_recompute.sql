-- =============================================================================
-- 14c_recompute.sql
-- Recompute denormalized member_count to match actual club_members rows.
-- Two functions: one club, or all-clubs-with-drift.
-- Both SECURITY DEFINER + sysadmin-gated.
-- =============================================================================

-- Recompute one club's member_count
create or replace function recompute_member_count(club_id_in uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  actual int;
begin
  if not is_super_admin() then
    raise exception 'Only sysadmin can recompute counters.'
      using errcode = '42501';
  end if;

  select count(*)::int into actual
    from club_members
   where club_id = club_id_in;

  update clubs set member_count = actual
   where id = club_id_in;

  return actual;
end;
$$;
grant execute on function recompute_member_count(uuid) to authenticated;

-- Recompute all clubs that have drift. Returns count of clubs fixed.
create or replace function recompute_all_member_counts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  fixed_count int := 0;
begin
  if not is_super_admin() then
    raise exception 'Only sysadmin can recompute counters.'
      using errcode = '42501';
  end if;

  with drift_clubs as (
    select c.id
      from clubs c
      left join club_members cm on cm.club_id = c.id
     where c.archived_at is null
     group by c.id, c.member_count
    having coalesce(c.member_count, 0) <> count(cm.profile_id)::int
  ),
  updated as (
    update clubs c
       set member_count = sub.actual
      from (
        select c2.id,
               (select count(*)::int from club_members where club_id = c2.id) as actual
          from clubs c2
         where c2.id in (select id from drift_clubs)
      ) sub
     where c.id = sub.id
     returning 1
  )
  select count(*)::int into fixed_count from updated;

  return fixed_count;
end;
$$;
grant execute on function recompute_all_member_counts() to authenticated;
