-- 16B addendum: append-only internal notes on applications.
--
-- The old single-column `applications.note` (+ `note_by`, `note_at`) let each
-- new note clobber the previous one. Multiple admins reviewing the same
-- application lost each other's context. Replaced with a history table:
-- each save inserts a new row; the UI shows the newest at top + collapsible
-- history below.
--
-- The old `applications.note*` columns are left in place for now (unused by
-- new code). Drop them in a future maintenance sweep.

create table if not exists application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists application_notes_app_created_idx
  on application_notes (application_id, created_at desc);

alter table application_notes enable row level security;

grant select, insert on application_notes to authenticated;

-- SELECT: any admin of the club that owns the application, or sysadmin.
-- Matches the read authority we already give on `applications` itself.
drop policy if exists application_notes_select on application_notes;
create policy application_notes_select on application_notes
  for select to authenticated using (
    is_super_admin()
    or exists (
      select 1
      from applications a
      join club_admins ca on ca.club_id = a.club_id
      where a.id = application_notes.application_id
        and ca.profile_id = auth.uid()
    )
  );

-- INSERT: manager/lead of that club, or sysadmin. Matches the write authority
-- previously enforced in `saveApplicationNote`. Editor tier cannot leave notes.
drop policy if exists application_notes_insert on application_notes;
create policy application_notes_insert on application_notes
  for insert to authenticated with check (
    author_id = auth.uid()
    and (
      is_super_admin()
      or exists (
        select 1
        from applications a
        join club_admins ca on ca.club_id = a.club_id
        where a.id = application_notes.application_id
          and ca.profile_id = auth.uid()
          and ca.admin_role in ('lead', 'manager')
      )
    )
  );

-- No UPDATE, no DELETE — append-only. Old notes stay visible with their
-- original author + timestamp forever.

-- Backfill any existing single-column notes into the history table so
-- past context isn't lost. Safe to re-run; the where-clauses guard.
insert into application_notes (application_id, author_id, body, created_at)
select id, note_by, note, coalesce(note_at, now())
from applications
where note is not null and note_by is not null
  and not exists (
    select 1 from application_notes n
    where n.application_id = applications.id
      and n.body = applications.note
  );
