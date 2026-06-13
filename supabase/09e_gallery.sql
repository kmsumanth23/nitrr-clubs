-- =============================================================================
-- 09e_gallery.sql
-- Storage bucket for club photos + RLS + the show_on_homepage flag.
-- =============================================================================

-- 1) Create the public bucket. Public read; writes gated by RLS.
insert into storage.buckets (id, name, public)
  values ('club-gallery', 'club-gallery', true)
  on conflict (id) do nothing;

-- 2) Add show_on_homepage column on gallery_photos
alter table gallery_photos
  add column if not exists show_on_homepage boolean not null default true;

-- 3) can_manage_gallery: any club admin (lead/manager/editor) or super_admin
create or replace function can_manage_gallery(club_id_in uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      (select role = 'super_admin' from profiles where id = auth.uid()),
      false
    )
    or exists (
      select 1 from club_admins
       where club_id = club_id_in
         and profile_id = auth.uid()
    );
$$;
grant execute on function can_manage_gallery(uuid) to authenticated;

-- 4) RLS on gallery_photos: public read; manage by can_manage_gallery
alter table gallery_photos enable row level security;

drop policy if exists "gallery_photos: public read" on gallery_photos;
create policy "gallery_photos: public read" on gallery_photos
  for select using (true);

drop policy if exists "gallery_photos: admin insert" on gallery_photos;
create policy "gallery_photos: admin insert" on gallery_photos
  for insert with check (can_manage_gallery(club_id));

drop policy if exists "gallery_photos: admin update" on gallery_photos;
create policy "gallery_photos: admin update" on gallery_photos
  for update using (can_manage_gallery(club_id));

drop policy if exists "gallery_photos: admin delete" on gallery_photos;
create policy "gallery_photos: admin delete" on gallery_photos
  for delete using (can_manage_gallery(club_id));

grant select on gallery_photos to anon, authenticated;
grant insert, update, delete on gallery_photos to authenticated;

-- 5) Storage RLS — gate write/delete on the path's first segment (club slug)
-- We resolve slug → club_id at runtime via a helper.
create or replace function club_id_from_slug(slug_in text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from clubs where slug = slug_in limit 1;
$$;
grant execute on function club_id_from_slug(text) to authenticated, anon;

-- Storage policies live on storage.objects. Path is `<club_slug>/<filename>`.
-- (storage.foldername(name))[1] gives the first segment.

drop policy if exists "club-gallery: public read" on storage.objects;
create policy "club-gallery: public read"
  on storage.objects for select
  using (bucket_id = 'club-gallery');

drop policy if exists "club-gallery: admin insert" on storage.objects;
create policy "club-gallery: admin insert"
  on storage.objects for insert
  with check (
    bucket_id = 'club-gallery'
    and can_manage_gallery(club_id_from_slug((storage.foldername(name))[1]))
  );

drop policy if exists "club-gallery: admin update" on storage.objects;
create policy "club-gallery: admin update"
  on storage.objects for update
  using (
    bucket_id = 'club-gallery'
    and can_manage_gallery(club_id_from_slug((storage.foldername(name))[1]))
  );

drop policy if exists "club-gallery: admin delete" on storage.objects;
create policy "club-gallery: admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'club-gallery'
    and can_manage_gallery(club_id_from_slug((storage.foldername(name))[1]))
  );
