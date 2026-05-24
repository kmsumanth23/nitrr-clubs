-- ============================================================
-- NITRR Clubs — 02_rls.sql
-- Row-Level Security. Run AFTER 01_schema.sql.
--
-- Model:
--   content tables (categories, clubs, club_team, events,
--     gallery_photos, faqs)  -> PUBLIC READ; write only by club admins
--     (or super_admin). categories/faqs -> write super_admin only.
--   profiles      -> read public fields of anyone; write only your own row.
--   applications  -> student sees/creates own; club admin sees/updates
--     applications to clubs they manage.
--   club_admins   -> readable by signed-in users; managed by super_admin.
-- ============================================================

-- Enable RLS everywhere
alter table profiles        enable row level security;
alter table categories      enable row level security;
alter table clubs           enable row level security;
alter table club_admins     enable row level security;
alter table club_team       enable row level security;
alter table events          enable row level security;
alter table applications    enable row level security;
alter table gallery_photos  enable row level security;
alter table faqs            enable row level security;

-- ---------- profiles ----------
create policy "profiles: public read"
  on profiles for select using (true);

create policy "profiles: insert own"
  on profiles for insert with check (id = auth.uid());

create policy "profiles: update own"
  on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- categories (public read; super_admin writes) ----------
create policy "categories: public read"
  on categories for select using (true);
create policy "categories: super_admin write"
  on categories for all using (is_super_admin()) with check (is_super_admin());

-- ---------- clubs (public read; club admin or super_admin writes) ----------
create policy "clubs: public read"
  on clubs for select using (true);
create policy "clubs: admin update"
  on clubs for update
  using (is_club_admin(id) or is_super_admin())
  with check (is_club_admin(id) or is_super_admin());
create policy "clubs: super_admin insert"
  on clubs for insert with check (is_super_admin());
create policy "clubs: super_admin delete"
  on clubs for delete using (is_super_admin());

-- ---------- club_admins (signed-in read; super_admin manages) ----------
create policy "club_admins: read"
  on club_admins for select using (auth.uid() is not null);
create policy "club_admins: super_admin write"
  on club_admins for all using (is_super_admin()) with check (is_super_admin());

-- ---------- club_team (public read; club admin writes) ----------
create policy "club_team: public read"
  on club_team for select using (true);
create policy "club_team: admin write"
  on club_team for all
  using (is_club_admin(club_id) or is_super_admin())
  with check (is_club_admin(club_id) or is_super_admin());

-- ---------- events (public read; club admin writes) ----------
create policy "events: public read"
  on events for select using (true);
create policy "events: admin write"
  on events for all
  using (is_club_admin(club_id) or is_super_admin())
  with check (is_club_admin(club_id) or is_super_admin());

-- ---------- gallery_photos (public read; club admin writes) ----------
create policy "gallery: public read"
  on gallery_photos for select using (true);
create policy "gallery: admin write"
  on gallery_photos for all
  using (is_club_admin(club_id) or is_super_admin())
  with check (is_club_admin(club_id) or is_super_admin());

-- ---------- faqs (public read of published; super_admin writes) ----------
create policy "faqs: public read published"
  on faqs for select using (is_published or is_super_admin());
create policy "faqs: super_admin write"
  on faqs for all using (is_super_admin()) with check (is_super_admin());

-- ---------- applications (the interesting one) ----------
-- Student: read own
create policy "applications: student read own"
  on applications for select using (profile_id = auth.uid());
-- Club admin / super_admin: read applications to clubs they manage
create policy "applications: admin read club"
  on applications for select
  using (is_club_admin(club_id) or is_super_admin());
-- Student: create their own application
create policy "applications: student insert own"
  on applications for insert with check (profile_id = auth.uid());
-- Student: update own (e.g. withdraw) ; Admin: update status/note
create policy "applications: student update own"
  on applications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "applications: admin update club"
  on applications for update
  using (is_club_admin(club_id) or is_super_admin())
  with check (is_club_admin(club_id) or is_super_admin());
