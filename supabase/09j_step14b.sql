-- =============================================================================
-- 09j_step14b.sql
-- Step 14b — Read-only observability functions.
-- - get_storage_usage(): per-club photo counts + bytes from storage.objects
-- - get_largest_photos(): top N largest files in club-gallery
-- - get_counter_drift(): clubs where member_count drifts from club_members
-- All three are SECURITY DEFINER + sysadmin-gated.
-- =============================================================================

-- 1) Per-club storage aggregates
create or replace function get_storage_usage()
returns table(
  club_slug text,
  club_name text,
  file_count int,
  total_bytes bigint
)
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if not is_super_admin() then
    raise exception 'Only sysadmin can view storage usage.'
      using errcode = '42501';
  end if;

  return query
    select
      split_part(o.name, '/', 1) as club_slug,
      c.name as club_name,
      count(*)::int as file_count,
      -- sum() over bigint returns numeric (PG hedges against overflow);
      -- cast back to bigint to match the function's declared return type.
      coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint as total_bytes
    from storage.objects o
    left join clubs c on c.slug = split_part(o.name, '/', 1)
    where o.bucket_id = 'club-gallery'
    group by split_part(o.name, '/', 1), c.name
    order by total_bytes desc;
end;
$$;
grant execute on function get_storage_usage() to authenticated;

-- 2) Photos above a size threshold (default 500 KB).
--    Original signature was get_largest_photos(limit_in int default 10),
--    returning the top N regardless of size. The threshold-based version
--    is more useful for sysadmin (find anomalously large photos to
--    investigate). PostgreSQL identifies functions by (name + arg types),
--    so the old int-arg version is NOT replaced by create-or-replace
--    when the new arg type is bigint -- it must be dropped explicitly.
drop function if exists get_largest_photos(int);

create or replace function get_largest_photos(
  threshold_bytes bigint default 512000,  -- 500 KB (binary; 500 * 1024)
  limit_in int default 100                -- safety cap as bucket grows
)
returns table(
  path text,
  bytes bigint,
  club_slug text,
  club_name text,
  uploaded_at timestamptz
)
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if not is_super_admin() then
    raise exception 'Only sysadmin can view storage details.'
      using errcode = '42501';
  end if;

  return query
    select
      o.name as path,
      coalesce((o.metadata->>'size')::bigint, 0) as bytes,
      split_part(o.name, '/', 1) as club_slug,
      c.name as club_name,
      o.created_at as uploaded_at
    from storage.objects o
    left join clubs c on c.slug = split_part(o.name, '/', 1)
    where o.bucket_id = 'club-gallery'
      and o.metadata->>'size' is not null
      and (o.metadata->>'size')::bigint > threshold_bytes
    order by (o.metadata->>'size')::bigint desc
    limit limit_in;
end;
$$;
grant execute on function get_largest_photos(bigint, int) to authenticated;

-- 3) Counter drift: clubs where manual member_count differs from actual
create or replace function get_counter_drift()
returns table(
  club_id uuid,
  slug text,
  name text,
  manual_count int,
  actual_count int,
  drift int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_super_admin() then
    raise exception 'Only sysadmin can view counter drift.'
      using errcode = '42501';
  end if;

  return query
    select
      c.id as club_id,
      c.slug,
      c.name,
      coalesce(c.member_count, 0) as manual_count,
      count(cm.profile_id)::int as actual_count,
      (coalesce(c.member_count, 0) - count(cm.profile_id)::int) as drift
    from clubs c
    left join club_members cm on cm.club_id = c.id
    where c.archived_at is null
    group by c.id, c.slug, c.name, c.member_count
    having coalesce(c.member_count, 0) <> count(cm.profile_id)::int
    order by abs(coalesce(c.member_count, 0) - count(cm.profile_id)::int) desc;
end;
$$;
grant execute on function get_counter_drift() to authenticated;
