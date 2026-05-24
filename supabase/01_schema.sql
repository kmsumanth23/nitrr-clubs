-- ============================================================
-- NITRR Clubs — 01_schema.sql
-- Enums, tables, foreign keys, indexes, triggers.
-- Run this FIRST in the Supabase SQL editor.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------- Enums ----------
create type user_role as enum ('student', 'admin', 'super_admin');
create type application_status as enum ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn');

-- ---------- updated_at trigger helper ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles — extends auth.users (1:1). Holds app-specific fields.
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  role        user_role not null default 'student',
  branch      text,
  year        int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- categories — club groupings (Tech, Sports, Arts, ...)
-- ============================================================
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  color       text,             -- hex for tag/card accent
  icon        text,             -- tabler icon name
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- clubs — the central hub. Almost everything FKs to this.
-- ============================================================
create table clubs (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  tagline        text,
  description    text,
  category_id    uuid references categories(id) on delete set null,
  logo_url       text,
  cover_url      text,
  highlights     text[] default '{}',   -- the 3-4 bullets shown on flip-card back
  member_count   int default 0,
  is_recruiting  boolean not null default true,
  instagram_url  text,
  linkedin_url   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_clubs_category on clubs(category_id);
create trigger trg_clubs_updated before update on clubs
  for each row execute function set_updated_at();

-- ============================================================
-- club_admins — AUTHORIZATION join: which profile may edit which club.
-- Many-to-many on purpose (a club can have several managers).
-- ============================================================
create table club_admins (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  admin_role  text not null default 'manager',   -- 'manager' | 'lead' etc (display only)
  created_at  timestamptz not null default now(),
  unique (club_id, profile_id)
);
create index idx_club_admins_club on club_admins(club_id);
create index idx_club_admins_profile on club_admins(profile_id);

-- ============================================================
-- club_team — DISPLAY-ONLY coordinators shown on the public page.
-- These people may not have login accounts. Distinct from club_admins.
-- ============================================================
create table club_team (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  role        text,                 -- 'Coordinator', 'Vice-Coordinator'...
  photo_url   text,
  contact     text,                 -- email or phone (public-facing)
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_club_team_club on club_team(club_id);

-- ============================================================
-- events — hosted by a club.
-- ============================================================
create table events (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references clubs(id) on delete cascade,
  slug          text not null unique,
  title         text not null,
  description   text,
  poster_url    text,
  venue         text,
  starts_at     timestamptz,
  ends_at       timestamptz,
  reg_open      boolean not null default true,
  reg_url       text,                -- external form, or null to use built-in
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_events_club on events(club_id);
create index idx_events_starts on events(starts_at);
create trigger trg_events_updated before update on events
  for each row execute function set_updated_at();

-- ============================================================
-- applications — a student applies to a club.
-- jsonb responses = flexible per-club questions without schema changes.
-- ============================================================
create table applications (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  status      application_status not null default 'pending',
  responses   jsonb not null default '{}',
  note        text,                 -- admin's internal note
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (club_id, profile_id)      -- one application per student per club
);
create index idx_applications_club on applications(club_id);
create index idx_applications_profile on applications(profile_id);
create trigger trg_applications_updated before update on applications
  for each row execute function set_updated_at();

-- ============================================================
-- gallery_photos — belongs to a club, optionally tied to an event.
-- ============================================================
create table gallery_photos (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  event_id    uuid references events(id) on delete set null,
  image_url   text not null,
  caption     text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_gallery_club on gallery_photos(club_id);
create index idx_gallery_event on gallery_photos(event_id);

-- ============================================================
-- faqs — standalone, no foreign keys. Powers FAQ section + /faq.
-- ============================================================
create table faqs (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,
  answer        text not null,
  sort_order    int not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Helper: is the current user an admin of a given club?
-- Used by RLS policies in 02_rls.sql.
-- ============================================================
create or replace function is_club_admin(target_club uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from club_admins
    where club_id = target_club and profile_id = auth.uid()
  );
$$;

-- Helper: is the current user a super_admin?
create or replace function is_super_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'super_admin'
  );
$$;
