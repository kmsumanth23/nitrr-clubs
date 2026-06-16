# NITRR Clubs — CLAUDE.md

The living source of truth for the NIT Raipur clubs & committees website rebuild. Update after every milestone.

---

## What we're building

A modern full-stack rebuild of the NIT Raipur clubs/committees website. Replaces an aging Create React App + Redux + static HTML project. Two purposes:

1. **A real production site** for NITRR clubs — public landing, club pages, events, gallery, recruitment workflow.
2. **A learning project** in parallel — HLD/LLD, SSR/CSR rendering strategies, RLS, migrations, CI/CD.

Visual language reference: communitie.in/hyderabad. Borrowed in spirit, not 1:1.

---

## Architecture

**Modular monolith.** One codebase, one Next.js deployment, but deliberate internal boundaries: `lib/queries/`, `lib/actions/`, `lib/validation/`, `components/<area>/`, `app/(<group>)/`. RLS is its own enforcement layer beneath the queries.

**Tech stack (locked):**
- Next.js 16 (App Router + Turbopack default) + TypeScript
- Tailwind CSS + shadcn/ui + Radix + Framer Motion
- Supabase: Postgres + Auth + Storage
- Postgres RLS for authority enforcement
- React Hook Form + Zod for forms
- Vercel hosting, GitHub Actions CI
- ESLint + Prettier

**Next 16 quirks worth knowing:**
- `middleware.ts` is renamed `proxy.ts`; export named `proxy`.
- `cookies()` cannot be used inside `generateStaticParams` (runs at build time). Use `lib/supabase/static.ts` → `createStaticClient()`.
- `useFormState` is deprecated; use `useActionState` from React 19.
- Turbopack default bundler; clear `.next` after migrations.

**Auth:** Supabase Auth via Google OAuth + email/password. Sessions in HttpOnly cookies, not localStorage. **Multi-account testing requires separate incognito windows per account.**

---

## Design system

| Token | Hex |
|---|---|
| `cream` | `#F7F3EC` (page bg) |
| `beige` | `#F0EAE0` |
| `ink` | `#1C1A17` (text) |
| `ink-soft` | `#6B6459` (secondary text) |
| `line` | `#E4DCCF` (borders) |
| `indigo` | `#5B52E0` (primary action) |
| `clay` | `#C26A4A` (warm accent placeholder) |

Fonts: Bricolage Grotesque (display), Geist Sans (body). UI/UX polish deferred to a focused pass after deploy.

---

## Role model

**Two independent dimensions.** A user's web authority and their roster membership in a club are **separate**.

### Global roles (column: `profiles.role`)
- `student` — default for any new account.
- `super_admin` — system-wide bypass of RLS. Also called **sysadmin**. Same role.
- `admin` — legacy enum value, unused.

### Per-club tiers (column: `club_admins.admin_role`)
Stored as text with values `lead`, `manager`, `editor`. (No enum type exists — `admin_role` is text.)

- `lead` — Overall Coordinator IRL. Full control. Can manage other admins of the same club.
- `manager` — Head Coordinator. Content + events + applications + gallery. Cannot manage admins.
- `editor` — Coordinator. Content + gallery only. No applications/members/admins access.

A user is a club admin if-and-only-if they have a row in `club_admins`. The navbar admin link shows when `isClubAdmin || super_admin`.

### Roster (column: `club_members`)
Independent of admin tiers. Lead can exist without being a member. Member can exist without being an admin. **The two never auto-link.** Membership materializes only when a recruitment is published with their accepted application; removal flips the application status to `removed`.

### Test accounts
| Account | Email | Setup |
|---|---|---|
| Gladiator | `examplemail@gmail.com` (Test1234!) | sysadmin + lead of Shaurya |
| Sumanth | `sumanth@nitrr.ac.in` | student + 2nd lead of Shaurya |
| Maximus | `maximus@nitrr.ac.in` | student + manager of Shaurya |
| Spartan | `spartan@nitrr.ac.in` | student + editor of Shaurya |
| Recruit | `recruit@nitrr.ac.in` (Test1234!) | pure student for apply-flow tests; CSE23010, year 2, CSE |

---

## Database schema (current after 12b)

```
profiles (id PK, email, full_name, role enum [student|admin|super_admin],
          roll_number, year, branch, gender, created_at)

categories (id PK, slug, name, sort_order)

clubs (id PK, slug unique, name, tagline, description,
       category_id FK, highlights text[], is_recruiting bool,
       member_count int, instagram_url, linkedin_url,
       community_whatsapp_link text,
       archived_at timestamptz,             -- soft-delete (sysadmin only)
       updated_by FK, created_at, updated_at)

club_admins (club_id FK, profile_id FK, admin_role text,  -- 'lead'|'manager'|'editor'
             primary key (club_id, profile_id))

club_members (club_id FK, profile_id FK, joined_at,
              primary key (club_id, profile_id))

club_team (id PK, club_id FK, name, position, photo_url, sort_order)

recruitments (id PK, club_id FK, name,
              deadline timestamptz, result_date timestamptz,
              results_published_at, results_published_by FK,
              interview_whatsapp_link text,
              interview_mode text CHECK in (online|offline|hybrid),
              created_by FK, created_at)

applications (id PK, club_id FK, profile_id FK,
              recruitment_id FK NOT NULL,
              status enum [pending|reviewing|accepted|rejected|withdrawn|removed],
              responses jsonb, note text, note_by FK, note_at,
              created_at, updated_at,
              UNIQUE (recruitment_id, profile_id))

events (id PK, club_id FK, slug unique, name, description,
        starts_at, ends_at, location, image_url, created_at)

gallery_photos (id PK, club_id FK, image_url, caption, sort_order,
                show_on_homepage bool default true, created_at)

faqs (id PK, question, answer, is_published, sort_order)

audit_log (id PK, actor_id FK, action text, target_club_id FK,
           target_profile_id FK, details jsonb, created_at)
  -- append-only, written by admin SQL functions
```

### Key SQL functions

**Recruitment lifecycle:**
- `recruitment_phase(uuid) → 'open' | 'review' | 'result'`
- `current_recruitment_for_club(uuid) → uuid`
- `enforce_application_phase()` trigger — honors `app.bypass_phase_check = 'true'` GUC for legitimate admin operations
- `publish_recruitment_results(uuid)` — lead-only, gated on zero pending/reviewing
- `start_new_recruitment(...)` — lead/manager
- `remove_member(uuid, uuid)` — SECURITY DEFINER, lead/sysadmin only

**Admin management (12a):**
- `can_manage_club_admins(uuid)` — true for lead of that club OR sysadmin
- `add_club_admin(uuid, uuid, text)` — lead+/sysadmin
- `remove_club_admin(uuid, uuid)` — lead+/sysadmin, blocked by last-lead protection
- `change_club_admin_tier(uuid, uuid, text)` — lead+/sysadmin

**Sysadmin (12b):**
- `set_super_admin(uuid, boolean)` — sysadmin only, can't demote self if last
- `create_club(text, text, uuid, uuid)` — sysadmin only, atomic with initial lead
- `decommission_club(uuid)` — sysadmin only, sets archived_at
- `restore_club(uuid)` — sysadmin only, clears archived_at
- `count_clubs_without_admins() → int` — anomaly helper
- `recruitments_overdue() → table(...)` — anomaly helper

**Gallery:**
- `can_manage_gallery(uuid)` — any club admin tier
- `club_id_from_slug(text) → uuid` — used by Storage RLS

**Auth helpers:**
- `is_super_admin()`, `can_edit_club_content(uuid)`, `can_manage_applications(uuid)`, `can_manage_admins(uuid)`, `club_tier(uuid)`, `is_club_admin(uuid)`

### Audit log

All admin-management actions (12a + 12b) write to `audit_log`. Viewer page lands in 12c. Querying directly:

```sql
select action, target_club_id, target_profile_id, details, created_at
from audit_log
order by created_at desc limit 50;
```

---

## Recruitment lifecycle (the core model)

```
  ┌──────────┐   deadline    ┌────────────┐   publish    ┌──────────┐
  │   OPEN   │ ────────────▶ │   REVIEW   │ ───────────▶ │  RESULT  │
  └──────────┘   passes      └────────────┘  (lead-only) └──────────┘
   • student CRUD              • admin decides            • locked
   • no decisions              • student locked           • members materialized
                               • interview WhatsApp        from accepteds
                                 reveals (step 11)
```

Each "Start new recruitment" inserts a new `recruitments` row. Old rows stay as history. Students can re-apply in future recruitments (different row), not in the same one (unique constraint blocks).

Status semantics:
- `pending` / `reviewing` — submitted / being reviewed
- `accepted` / `rejected` — admin decision (masked to student during review phase)
- `withdrawn` — student withdrew during open phase
- `removed` — was accepted/member, then removed via `remove_member`

**Status masking during review phase** — student sees "Under review" regardless of admin's decision until publish. Enforced in `application-row.tsx` via `displayStatus` — data is correct, UI masks.

---

## Routes & rendering strategy

| Group | Routes | Strategy |
|---|---|---|
| `(marketing)` | `/`, `/clubs`, `/clubs/[slug]`, `/events`, `/events/[slug]`, `/gallery`, `/about`, `/faq`, `/contact` | ISR for home/clubs/events; SSG for about/faq. Archived clubs filtered out. |
| `(marketing)` | `/clubs/[slug]/apply` | SSR with auth gate |
| `(auth)` | Sign-in modal + `/auth/callback` | client |
| `(student)` | `/profile` | SSR with auth gate |
| `(admin)` | `/admin`, `/admin/clubs/[slug]/...` | SSR with auth + tier gate |
| `(admin)` | `/admin/sysadmin/...` | SSR with sysadmin gate (12b) |

CSR islands inside SSR pages: filter pills, edit forms, modals, dashboards.

Auth gate pattern: route group's `layout.tsx` does session check → query hits RLS as second gate.

---

## Per-club admin pages

| Path | Who can view | Who can edit |
|---|---|---|
| `/admin/clubs/[slug]` (Edit content) | Any admin tier | Manager + Lead + Sysadmin |
| `/admin/clubs/[slug]/events` | Any admin tier | Manager + Lead + Sysadmin |
| `/admin/clubs/[slug]/recruitment` (12b-refinement) | Manager + Lead + Sysadmin | Same |
| `/admin/clubs/[slug]/applications` | Manager + Lead + Sysadmin | Same |
| `/admin/clubs/[slug]/members` | Manager + Lead + Sysadmin (view); Lead + Sysadmin (remove) | — |
| `/admin/clubs/[slug]/admins` (12a) | Any admin tier (view); Lead + Sysadmin (manage) | — |
| `/admin/clubs/[slug]/gallery` | Any admin tier | Same |

The Edit page handles content only (name, tagline, category, description, highlights, member_count, community link, socials, danger zone). Recruitment lifecycle (deadline, result_date, is_recruiting toggle, "Start new recruitment") lives on its own page. The two have separate save semantics: `updateClubContent` touches only `clubs`; `updateRecruitment` touches the current `recruitments` row + `clubs.is_recruiting`.

---

## What's done and what's left

### Done
- **1-4:** Scaffold, Supabase schema/RLS/seed/clients, design system + nav + footer, full landing page (10 sections)
- **5:** Public clubs listing + detail pages
- **6:** Auth (Google OAuth code path; console setup pending)
- **7:** Public events pages
- **8:** Gallery placeholder page
- **9a:** Student profile + applications list
- **9b:** Admin shell + edit-club + club_admins-based authority
- **9c:** Admin events CRUD + sidebar pill + unsaved-changes guard
- **9d:** Admin applications review
- **9d-fixes:** Three-phase model, publish RPC, status masking, membership-at-publish-only
- **9e:** Gallery upload (Supabase Storage, client-side resize, homepage opt-out)
- **9f-1:** Recruitments table migration; data + queries + actions threaded through
- **9f-2:** Start new recruitment + Remove member; GUC trigger bypass
- **9f-3:** Active vs History split on /profile; Current/History tabs on admin applications
- **12a:** Per-club admin management UI (audit log table created, writes start here)
- **12b:** Sysadmin landing + super_admin management + create club + decommission/restore
- **12b-refinement:** Recruitment lifecycle moved out of Edit form into its own `/recruitment` page; `updateClub` split into `updateClubContent` + `updateRecruitment` for separate save scopes

### Left

| Step | Description |
|---|---|
| **12c** | Audit log viewer UI + CSV exports (per-club, all-members, all-admins) |
| **13** | Deploy (Vercel + GH Actions CI) |
| **14** | Content management + system polish (FAQ editor, category editor, activity feed, storage usage, bulk import, recompute counts) |
| **15** | Notifications + comms (email via Resend, banner system, site config flags) |
| **16** | Year-restricted positions + per-position custom questions + WhatsApp link reveals |
| **17** | Advanced data export (PDF, per-cycle reports, annual reports, JSON backup) |
| **18** | Polish + extras (health checks, profile/user management for sysadmin, etc.) |
| **19** | UI/UX pass (mobile redesigns, restore club-card style on /profile, accent color decision, badges) |

Step 16 was originally numbered 11 — it's the year-restricted positions feature. Pushed back because it benefits from real-world user feedback first (deploy → users → step 16).

---

## Step 16 — design locked (was step 11)

**Per-position with year eligibility.** Schema sketch:

```sql
recruitment_positions (
  id, recruitment_id FK, title, openings_count int,
  eligibility_min_year int, eligibility_max_year int,
  created_at
)

position_questions (
  id, position_id FK, prompt text, sort_order int, required bool
)

applications.position_id uuid FK references recruitment_positions(id)
  -- nullable; in step 16 we'll backfill existing apps to an implicit
  -- "Volunteer" position per recruitment, then make NOT NULL
```

UI: club has multiple positions per recruitment, each with year eligibility + custom question set. Student sees only eligible positions. Admin reviews grouped by position. Interview WhatsApp link revealed at deadline; community WhatsApp link revealed at publish (data already collected in 9f-2).

---

## Working approach & lessons baked in

### Build cadence
- Incremental, step-ordered. Each step ships a `SETUP_STEP*.md` file map + run instructions + smoke test path.
- Re-output only files that actually change.
- Terse explanations preferred — code + run instructions, minimal prose.
- Complex reconciliation tasks handed off to Claude Code in VS Code.

### Lessons baked in

1. **RLS is a safety net, not a query filter.** Always explicit `.eq("profile_id", user.id)` / `.eq("club_id", clubId)`. RLS policies use OR semantics. *(9a applications-leak bug.)*

2. **GRANTs and RLS are two separate layers.** Every new table needs both. *(9b club-edit bug.)*

3. **Verify trigger/constraint/function names against `information_schema` before writing drops.** Never assume the name matches your migration SQL. *(9f-1 trigger error from lurking `enforce_application_deadline`.)*

4. **Migrations need to disable downstream triggers during data moves.** Wrap data mutation in `alter table X disable trigger T` / `enable trigger T`. *(9f-1 migration crash.)*

5. **When rewriting files after a migration, preserve export surfaces.** Surgical internal edits where columns moved, not full rewrites from scratch. *(9f-1 aftermath dropped getCategories, getAllClubSlugs, etc.)*

6. **`cookies()` cannot be used inside `generateStaticParams`** (Next 16 strict). Use `lib/supabase/static.ts` → `createStaticClient()`.

7. **Nested `<form>` elements cause hydration errors.** Modals containing forms must render outside any parent `<form>` in the DOM tree. *(9f-2 club-edit form.)*

8. **Navbar auth check must use the right authority source.** Authority lives in `club_admins`, not `profiles.role`. *(9b navbar bug.)*

9. **Three-phase recruitment model prevents stale membership state.** Membership materializes at publish, not accept-click. *(9d revert-from-accepted bug.)*

10. **Multi-account testing needs separate incognito windows.** Supabase auth in HttpOnly cookies, not localStorage.

11. **Custom Postgres GUCs (with dot prefix) don't need superuser privilege.** Use `set_config('app.bypass_phase_check', 'true', true)` for function-level signals to triggers. *(9f-2 remove_member trigger conflict.)*

12. **Don't assume database types exist.** `club_admins.admin_role` is `text`, not an enum named `admin_tier`. Always verify the actual column type before writing casts in SQL. *(12a `admin_tier does not exist` error.)*

13. **SQL editor's `auth.uid()` is NULL.** Test functions via the app, not the SQL editor — the editor uses postgres role, not your user's JWT, so SECURITY DEFINER auth checks return false.

14. **INSERT column/value counts must match.** Always count both lists before running. *(9f-2 start_new_recruitment off-by-one with created_by.)*

15. **Don't name plpgsql variables after PG-reserved identifiers.** `current_role`, `current_user`, `session_user`, `current_schema` are SQL keywords that resolve to builtins inside expressions even when shadowed by a local variable. The function compiles fine; the bug only shows up at runtime, where comparisons silently use the builtin (e.g. `current_role` returns `'authenticated'`). Name target variables `target_role`, `actor_role`, etc. *(12b set_super_admin demote-always-fails bug.)*

### File-shipping conventions
- Flat output uses `__` as path separator (e.g. `marketing__page.tsx` = `app/(marketing)/page.tsx`)
- Reserved Next names exact: `page.tsx`, `layout.tsx`, `route.tsx`, `proxy.ts`
- Helper/component files preserve real paths
- Setup file always `SETUP_STEP<N>.md`

### Dev recipe
- Clear `.next` after migrations
- `tsc --noEmit` after batch file drops
- `grep -rn "<dropped column>" lib/ components/ app/ --include="*.ts" --include="*.tsx"` after dropping any column
- For admin queries: confirm `grep "^export" lib/queries/<file>.ts` matches consumer imports

### Manual SQL maintenance reference

```sql
-- Force-clear a publish stamp
update recruitments
set results_published_at = null, results_published_by = null
where id = current_recruitment_for_club(
  (select id from clubs where slug = 'shaurya')
);

-- Manually flip an application status (bypass trigger via GUC)
select set_config('app.bypass_phase_check', 'true', false);
update applications set status = 'removed' where id = '<uuid>';

-- Check current recruitment for a club by slug
select r.* from recruitments r
join clubs c on c.id = r.club_id
where c.slug = 'shaurya'
order by r.created_at desc;

-- Find all triggers on a table
select trigger_name, action_statement
from information_schema.triggers
where event_object_table = 'applications';

-- Check column type before writing SQL casts
select column_name, data_type, udt_name
from information_schema.columns
where table_name = 'club_admins' and column_name = 'admin_role';

-- Audit log recent activity
select action, target_club_id, target_profile_id, details, created_at
from audit_log order by created_at desc limit 20;
```

---

## Open small flags (not blocking, deferred)

- Super_admin shows generic "Lead" tag on clubs they don't formally admin — should show distinct "Super_admin" badge (cosmetic, UI/UX pass)
- `useUser` hook can briefly flip to "not logged in" on transient network errors — should preserve previous state (defer to polish pass)
- My clubs section on /profile renders as plain inline list — club-card aesthetic to be restored in UI/UX pass
- Mobile-specific section redesigns deferred
- Real photos, font polishing deferred
- Google OAuth console setup pending (code path done since step 6)
