-- =============================================================================
-- 09i_step14a.sql
-- Step 14a — FAQ editor + Category editor support.
-- - Idempotent FAQ sysadmin write policy
-- - Atomic reorder RPCs for faqs and categories
-- - Helper for category delete guard
-- =============================================================================

-- 1) FAQ sysadmin write policy (idempotent — only adds if missing)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'faqs'
      and policyname = 'faqs: super_admin write'
  ) then
    create policy "faqs: super_admin write"
      on faqs for all
      using (is_super_admin())
      with check (is_super_admin());
  end if;
end $$;

-- 2) Swap two FAQ sort_orders atomically
create or replace function swap_faq_order(
  id_a uuid,
  id_b uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sort_a int;
  sort_b int;
begin
  if not is_super_admin() then
    raise exception 'Only sysadmin can reorder FAQs.' using errcode = '42501';
  end if;

  select sort_order into sort_a from faqs where id = id_a;
  select sort_order into sort_b from faqs where id = id_b;

  if sort_a is null or sort_b is null then
    raise exception 'One or both FAQs not found.' using errcode = '22023';
  end if;

  update faqs set sort_order = sort_b where id = id_a;
  update faqs set sort_order = sort_a where id = id_b;
end;
$$;
grant execute on function swap_faq_order(uuid, uuid) to authenticated;

-- 3) Swap two category sort_orders atomically
create or replace function swap_category_order(
  id_a uuid,
  id_b uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sort_a int;
  sort_b int;
begin
  if not is_super_admin() then
    raise exception 'Only sysadmin can reorder categories.' using errcode = '42501';
  end if;

  select sort_order into sort_a from categories where id = id_a;
  select sort_order into sort_b from categories where id = id_b;

  if sort_a is null or sort_b is null then
    raise exception 'One or both categories not found.' using errcode = '22023';
  end if;

  update categories set sort_order = sort_b where id = id_a;
  update categories set sort_order = sort_a where id = id_b;
end;
$$;
grant execute on function swap_category_order(uuid, uuid) to authenticated;

-- 4) Count clubs in a category (for delete guard).
--    Only counts active (non-archived) clubs.
create or replace function count_clubs_in_category(
  category_id_in uuid
)
returns int
language sql
stable
as $$
  select count(*)::int
  from clubs
  where category_id = category_id_in
    and archived_at is null;
$$;
grant execute on function count_clubs_in_category(uuid) to authenticated;
