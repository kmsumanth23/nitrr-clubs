# NITRR Clubs — CLAUDE.md

The living source of truth for the NIT Raipur clubs & committees website rebuild. Update after every milestone.

Last major refresh: post-17A. Step 16 (recruitment refactor) shipped end-to-end. Step 17A (polish + drive-specific community link + My Clubs redesign) shipped. 17B-27 sequenced below.

---

## What we're building

A modern full-stack rebuild of the NIT Raipur clubs/committees website. Replaces an aging Create React App + Redux + static HTML project. Two purposes:

1. **A real production site** for NITRR clubs — public landing, club pages, events, gallery, recruitment workflow.
2. **A learning project** in parallel — HLD/LLD, SSR/CSR rendering strategies, RLS, migrations, CI/CD.

Visual language reference: communitie.in/hyderabad. Borrowed in spirit, not 1:1.

**Live at:** https://nitrr-clubs.vercel.app

Project not yet handed over to the college. Production downtime is not a concern during active development.

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
- Resend for transactional emails (from step 15)

**Next 16 quirks:**
- `middleware.ts` is renamed `proxy.ts`; export named `proxy`.
- `cookies()` cannot be used inside `generateStaticParams` (runs at build time). Use `lib/supabase/static.ts` → `createStaticClient()`.
- `useFormState` deprecated; use `useActionState` from React 19.
- Turbopack default; clear `.next` after migrations.

**Auth:** Supabase Auth via Google OAuth + email/password. Sessions in HttpOnly cookies. **Multi-account testing requires separate incognito windows.** Email allowlist active from 15e (nitrr.ac.in, gmail.com, googlemail.com, outlook.com, yahoo.com, protonmail.com, icloud.com, examplemail.com), with Gmail canonicalization.

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
| `clay` | `#C26A4A` (warm accent placeholder — final decision in step 27) |
| WhatsApp brand | `#25D366` (only on WhatsApp icons) |
| Instagram brand | `#E4405F` (only on Instagram icon in My Clubs) |

Fonts: Bricolage Grotesque (display), Geist Sans (body). UI/UX polish deferred to step 27.

---

## Role model

**Two independent dimensions.** Web authority and roster membership are **separate**.

### Global roles (column: `profiles.role`)
- `student` — default
- `super_admin` — system-wide bypass of RLS. Also called **sysadmin**
- `admin` — legacy enum value, unused

### Per-club web-admin tiers (column: `club_admins.admin_role`)
Text with values `lead`, `manager`, `editor`.

- `lead` — Overall Coordinator IRL. Full control. Can manage other admins of the same club.
- `manager` — Head Coordinator. Content + events + applications + gallery. Cannot manage admins.
- `editor` — Coordinator. Content + gallery only.

A user is a club admin iff they have a row in `club_admins`. Navbar admin link shows when `isClubAdmin || super_admin`.

### Per-club member roles (column: `club_members.role`) — step 17B
Structural enum with optional custom display label:
- `volunteer` — Year 1 default
- `coordinator` — Year 2 default
- `core_coordinator` — Year 3 default
- `head_coordinator` — Year 4 default
- `overall_coordinator` — Year 4 default (usually one per club)

Year defaults are advisory (soft warning at drive creation, non-blocking). Custom labels via `recruitments.role_label` at drive creation, snapshotted to `club_members.role_label` on publish.

**Web-admin overlay:** if a `club_members` row also has a `club_admins` row, `/profile` My Clubs card shows two pills — member role tag + web-admin tier tag. External viewers on public club team display do NOT see the web-admin overlay (kept internal — step 21 will surface public club team display separately).

### Roster (column: `club_members`)
Independent of admin tiers. Lead can exist without being a member. Member can exist without being an admin. **The two never auto-link.** Membership materializes only when a recruitment is published with their accepted application; removal flips the application status to `removed`.

**Single-cycle constraint (17B):** A student holds only one active member role per club per cycle. `publish_recruitment_results` INSERTs on unique `(club_id, profile_id)`. Cross-cycle role changes via:
- Bulk promotion UI on `/admin/clubs/[slug]/members` at cycle end
- `exclude_from_promote` boolean flag per member — UI-only, filters out of bulk promotion
- Manual role edits via admin UI (no year-warning; considered intentional override)

### Test accounts
| Account | Email | Setup |
|---|---|---|
| Gladiator | `examplemail@gmail.com` (Test1234!) | sysadmin + lead of Shaurya |
| Sumanth | `sumanth@nitrr.ac.in` | student + 2nd lead of Shaurya |
| Maximus | `maximus@nitrr.ac.in` | student + manager of Shaurya |
| Spartan | `spartan@nitrr.ac.in` | student + editor of Shaurya |
| Recruit | `recruit@nitrr.ac.in` (Test1234!) | pure student for apply-flow tests; CSE23010, year 2, CSE |
| welcometest | `welcometest@examplemail.com` | test-only allowlist domain check |

---

## Recruitment lifecycle (final model — post-16)

```
  ┌──────────┐   publish   ┌──────────┐   deadline    ┌────────────┐   publish    ┌──────────┐
  │  DRAFT   │────────────▶│   OPEN   │─────────────▶│   REVIEW   │─────────────▶│  RESULT  │
  └──────────┘  (lead)     └──────────┘   passes     └────────────┘  results     └──────────┘
   • admin only              • student CRUD            • admin decides            • locked
   • not visible             • no decisions            • student locked           • members materialized
   • edit freely             • interview WhatsApp      • interview WhatsApp         from accepteds
                               revealed on apply         still revealed           • community WhatsApp
                                                                                    revealed to accepteds
```

**Drives are the unit** (post-16A). No positions, no umbrella table. Each `recruitments` row is a drive. Multiple drives per club allowed simultaneously.

Each drive has:
- Name + description
- Target years (`int[]`, subset of `{1,2,3,4}`)
- Deadline + result date
- Own question set (`drive_questions` table — 16A)
- Interview WhatsApp link (mandatory — 16C)
- Optional drive-scoped community WhatsApp link (17A)
- Draft state via `published_at NULL` (16A)
- Role on accept + optional custom label (17B)
- Optional departments with ranked preferences (17C)

**Status semantics on `applications`:**
- `pending` / `reviewing` — submitted / being reviewed
- `accepted` / `rejected` — admin decision (masked to student until publish)
- `withdrawn` — student withdrew during open phase
- `removed` — was accepted/member, then removed via `remove_member`

**Status masking:** student sees "Under review" for accepted/rejected until `results_published_at IS NOT NULL`. Mask key is `results_published_at`, NOT `phase === "review"` (17A addendum 3 fix — preserves masking across deadline-extension roundtrips).

**Soft-gate review edits (16B addendum 2):** only `result` phase locks drive metadata. Draft/open/review allow field edits (deadline extension rolls review → open through derived phase). Question CRUD stays blocked in review because students have already answered them.

**Community link resolution chain (17A, extended in 17C):**
1. `drive_departments.community_whatsapp_link` for member's `accepted_department_id` (17C)
2. `recruitments.community_whatsapp_link` (17A — drive-level)
3. `clubs.community_whatsapp_link` (16C — club-level)

Resolution is **live at query time**, not snapshotted. Admin editing any link is immediately visible to members.

---

## Database schema (post-17A, with 17B/17C planned columns marked)

```
profiles (id PK, email, full_name, role enum [student|admin|super_admin],
          roll_number, year, branch, gender, created_at)

categories (id PK, slug, name, sort_order)

clubs (id PK, slug unique, name, tagline, description,
       category_id FK, highlights text[], is_recruiting bool,     -- vestigial, drop in step 25
       member_count int, instagram_url, linkedin_url,
       community_whatsapp_link text,                              -- 16C — fallback community link
       archived_at timestamptz,                                    -- soft-delete (sysadmin only)
       updated_by FK, created_at, updated_at)

club_admins (club_id FK, profile_id FK, admin_role text,          -- 'lead'|'manager'|'editor'
             primary key (club_id, profile_id))

club_members (club_id FK, profile_id FK, joined_at,
              role text NOT NULL DEFAULT 'volunteer',              -- 17B
              role_label text NULL,                                -- 17B: custom display override
              exclude_from_promote boolean NOT NULL DEFAULT false, -- 17B: UI-only flag
              source_recruitment_id uuid NULL                      -- 17B: which drive materialized this
                REFERENCES recruitments(id) ON DELETE SET NULL,
              primary key (club_id, profile_id))

club_team (id PK, club_id FK, name, position, photo_url, sort_order)  -- display-only, curated

recruitments (id PK, club_id FK, name, description,
              target_years int[] DEFAULT '{1,2,3,4}',              -- 16A
              deadline timestamptz, result_date timestamptz,
              published_at timestamptz NULL,                        -- 16A: null = draft
              results_published_at, results_published_by FK,
              interview_whatsapp_link text NOT NULL,                -- 16C: mandatory
              community_whatsapp_link text NULL,                    -- 17A: drive-scoped optional
              role_on_accept text NOT NULL DEFAULT 'volunteer',     -- 17B: structural enum
              role_label text NULL,                                 -- 17B: custom label
              max_department_choices int NOT NULL DEFAULT 2         -- 17C
                CHECK (max_department_choices BETWEEN 1 AND 6),
              interview_mode text CHECK in (online|offline|hybrid),
              created_by FK, created_at)

drive_questions (id PK, recruitment_id FK ON DELETE CASCADE,        -- 16A
                 prompt text, sort_order int, required bool,
                 question_type text DEFAULT 'long_text',
                 created_at)

drive_departments (id PK, recruitment_id FK ON DELETE CASCADE,      -- 17C
                   name text, community_whatsapp_link text NULL,
                   sort_order int, created_at,
                   UNIQUE (recruitment_id, name))

applications (id PK, recruitment_id FK ON DELETE CASCADE,
              profile_id FK,
              status enum [pending|reviewing|accepted|rejected|withdrawn|removed],
              responses jsonb,                                       -- 16B: Record<question_id, string>
              preferred_departments uuid[] NULL,                     -- 17C: ordered ranking
              accepted_department_id uuid NULL                       -- 17C
                REFERENCES drive_departments(id) ON DELETE RESTRICT,
              -- note, note_by, note_at columns still exist (vestigial post-16B addendum 1)
              -- drop in step 18 maintenance sweep
              created_at, updated_at,
              UNIQUE (recruitment_id, profile_id))

application_notes (id PK, application_id FK ON DELETE CASCADE,       -- 16B addendum 1
                   author_id FK profiles(id), note text NOT NULL,
                   created_at)

events (id PK, club_id FK, slug unique, name, description,
        starts_at, ends_at, location, image_url, created_at)

gallery_photos (id PK, club_id FK, image_url, caption, sort_order,
                show_on_homepage bool default true, created_at)

faqs (id PK, question, answer, is_published, sort_order)

audit_log (id PK, actor_id FK, action text, target_club_id FK,
           target_profile_id FK, details jsonb, created_at)
```

---

## Key SQL functions

### Drive management (16A/16C/17A/17B/17C)
- `create_drive(club_id, name, description, target_years, deadline, result_date, interview_whatsapp_link, community_whatsapp_link, role_on_accept, role_label, max_department_choices) → uuid` — lead/sysadmin; creates in draft; interview link mandatory; no auto-populated questions
- `update_drive(...)` — lead/manager/sysadmin; soft-gate: only result phase blocks
- `update_drive_community_link(drive_id, community_whatsapp_link)` — lead/manager/sysadmin; **all phases** (17A post-publish carve-out)
- `publish_drive(drive_id)` — lead/sysadmin; requires target_years + deadline + interview_whatsapp_link + ≥1 question
- `delete_drive(drive_id)` — draft: unrestricted; open: only if zero applications; review/result: blocked
- `add_drive_question`, `update_drive_question`, `delete_drive_question`, `swap_drive_question_order`
- `add_drive_department`, `update_drive_department`, `delete_drive_department`, `swap_drive_department_order` (17C)
- `set_accepted_department(application_id, department_id)` (17C — all phases)

### Phase computation (16A)
- `recruitment_phase(uuid) → 'draft' | 'open' | 'review' | 'result'` — draft check comes first (published_at is null)
- `enforce_application_phase()` trigger — blocks application creation/edit against drives in `draft` phase

### Publish + membership (17B refined)
- `publish_recruitment_results(uuid)` — lead-only; INSERTs into `club_members` with `role = recruitment.role_on_accept`, `role_label = recruitment.role_label`, `source_recruitment_id = drive_id`. Unique guard prevents double-membership per club. Writes `publish_results` audit entry. **16C fix**: removed legacy sync-flip block.

### Member management (17B)
- `update_member_role(club_id, profile_id, role, role_label)` — lead/sysadmin
- `toggle_member_exclude_from_promote(club_id, profile_id, exclude)` — lead/sysadmin
- `remove_member(uuid, uuid)` — lead/sysadmin; writes audit entry
- `bulk_promote_members(club_id, member_selections jsonb)` — lead/sysadmin; atomic

### Admin management (12a/12b)
- `add_club_admin`, `remove_club_admin`, `change_club_admin_tier`, `can_manage_club_admins`
- `set_super_admin`, `create_club`, `decommission_club`, `restore_club`

### Auth helpers
- `is_super_admin()`, `can_edit_club_content(uuid)`, `can_manage_applications(uuid)`, `can_manage_admins(uuid)`, `club_tier(uuid)`, `is_club_admin(uuid)`

---

## Audit log

Append-only. RLS: sysadmin reads everything; lead/manager reads entries where `target_club_id` matches a club they admin.

**Action → viewer category** (see `lib/audit/categorize.ts`):

| Category pill | SQL `action` values |
|---|---|
| Club admins | `add_club_admin`, `remove_club_admin`, `change_club_admin_tier` |
| Clubs | `create_club`, `decommission_club`, `restore_club` |
| Drives | `create_drive`, `publish_drive`, `delete_drive` (16A) |
| Super admins | `set_super_admin` |
| Members | `publish_results`, `remove_member`, `bulk_promote_members` (17B) |

Club content edits (description, socials, member count) are intentionally NOT logged. Question CRUD is NOT logged (high-volume, low value).

**Viewer pages:**
- `/admin/sysadmin/audit` — system-wide, with per-club dropdown
- `/admin/clubs/[slug]/audit` — scoped to one club

Cursor pagination on `created_at desc`, 50 rows/page.

---

## Email notifications (step 15 series)

**Provider:** Resend (transactional). Currently sends from `onboarding@resend.dev` (test mode) — swap to custom domain before college handover.

**Templates in `lib/email/templates/`:**
- Application result (accepted / rejected) — 15a
- Admin role assignment — 15b
- New user welcome — 15b
- Email verification — 15c (6 debug rounds; see lessons)
- Forgot password — 15d
- Interview invite (16C) — sent on drive publish
- Interview reminder (16C) — 30-day / 7-day / 24-hour cadence

**Timezone handling** — all datetime formatting explicitly uses `Asia/Kolkata`. Naive `new Date().toISOString()` breaks in Node serverless env (UTC).

**FK disambiguation on joins** — `applications.profile_id_fkey` and `applications.note_by_fkey` (legacy from 09b) both reference `profiles`. All queries embedding profiles from applications must use explicit `profiles!applications_profile_id_fkey(...)`. See 16C side fix. Vestigial `note_by` column drops in step 18.

---

## Routes & rendering strategy

| Group | Routes | Strategy |
|---|---|---|
| `(marketing)` | `/`, `/clubs`, `/events`, `/events/[slug]`, `/gallery`, `/about`, `/faq`, `/contact` | ISR for home/clubs list; SSG for about/faq |
| `(marketing)` | `/clubs/[slug]` | Force-dynamic (auth-dependent aside for community link — 16C) |
| `(marketing)` | `/clubs/[slug]/apply` | SSR — landing/picker for drives (16B) |
| `(marketing)` | `/clubs/[slug]/apply/[driveId]` | SSR — drive-specific apply page (16B) |
| `(auth)` | Sign-in modal + `/auth/callback` + `/auth/verify-email` + `/auth/forgot-password` + `/auth/reset-password` | client + SSR mix |
| `(student)` | `/profile` | SSR — My Clubs (17A redesign) + Applications + History |
| `(admin)` | `/admin`, `/admin/clubs/[slug]/...` | SSR with auth + tier gate |
| `(admin)` | `/admin/sysadmin/...` | SSR with sysadmin gate |
| `(admin)` | `/admin/api/export/{club-roster,all-members,all-admins}` | GET route handlers; CSV download |

CSR islands inside SSR pages: filter pills, edit forms, modals, dashboards.

---

## Per-club admin pages

| Path | Who can view | Who can edit |
|---|---|---|
| `/admin/clubs/[slug]` (Edit content) | Any admin tier | Manager + Lead + Sysadmin |
| `/admin/clubs/[slug]/events` | Any admin tier | Same |
| `/admin/clubs/[slug]/recruitment` (16A rewrite) | Manager + Lead + Sysadmin | Same — drives list |
| `/admin/clubs/[slug]/recruitment/new` | Manager + Lead + Sysadmin | Same |
| `/admin/clubs/[slug]/recruitment/[driveId]` | Manager + Lead + Sysadmin | Same |
| `/admin/clubs/[slug]/applications` (16B rewrite) | Manager + Lead + Sysadmin | Same — drive-picker driven |
| `/admin/clubs/[slug]/members` | Manager + Lead + Sysadmin (view); Lead + Sysadmin (remove/promote — 17B) | — |
| `/admin/clubs/[slug]/admins` | Any admin tier (view); Lead + Sysadmin (manage) | — |
| `/admin/clubs/[slug]/gallery` | Any admin tier | Same |
| `/admin/clubs/[slug]/audit` | Manager + Lead + Sysadmin | — (read-only) |

Recruitment lifecycle is drive-driven — Edit page handles content only (`updateClubContent`). `updateRecruitment` legacy action is dead code, queued for step 18 sweep.

---

## What's done and what's left

### Done
- **1-4:** Scaffold, Supabase schema/RLS/seed/clients, design system + nav + footer, full landing page
- **5:** Public clubs listing + detail pages
- **6:** Auth (Google OAuth code path; email/password added in 15)
- **7:** Public events pages
- **8:** Gallery placeholder page
- **9a-9f:** Student profile + applications, admin shell, events CRUD, applications review, gallery upload, recruitments migration, remove member, active/history split
- **12a-12c:** Admin management UI, sysadmin landing, audit log viewer + CSV exports
- **13:** Deploy (Vercel + GH Actions CI) — live at nitrr-clubs.vercel.app
- **14a-14f:** FAQ/Category editors, activity feed, storage report, counter drift, recompute, bulk import, permanent delete, decommissioned badges, public archived club page, unified profile My Clubs
- **15a:** Resend integration + Application result email
- **15b:** Admin role + Welcome emails
- **15c:** Email verification flow (6 debug rounds — see lessons 18/19)
- **15d:** Forgot password flow (4 refinement rounds)
- **15e:** Email domain allowlist + Gmail canonicalization
- **16a:** Drive schema + admin drive management (3 batches + post-landing fixes)
- **16b:** Public apply flow + admin drive-driven review + profile updates (2 batches + 3 addendums)
- **16c:** WhatsApp reveals + mandatory interview link (2 batches + side fixes)
- **17a:** Polish + drive-specific community WhatsApp link + My Clubs 2-col redesign (1 batch + addendum)

### Sequenced next
| Step | Description |
|---|---|
| **17b** | Role tags on drives + members + web-admin overlay + bulk promotion UI |
| **17c** | Departments per drive + ranked preferences + placement UI |
| **18** | Post-17 maintenance sweep (dead-code removal, column drops, types regen) |
| **19** | Post-deploy P0/P1 security (year impersonation, safeNext hardening, signout CSRF) |
| **20** | Question-edit data integrity (snapshot pattern + applicant notification on drive edit) |
| **21** | Public club pages refinement + `club_team` display + per-club role hierarchy customization |
| **22** | Events page refactor + RSVP + digital event submissions (Google Drive) |
| **23** | File submissions on drives (drive creation option + applicant uploads + admin review) |
| **24** | Members CSV import (members + admins in one flow) |
| **25** | Compute `clubs.is_recruiting` from drives (drop the column) |
| **26** | Year update mechanism (semester tracking + auto-counter + manual override) |
| **27** | UI/UX polish pass (accent color decision, mobile redesigns, badges) |

### Backlog (not scheduled)
- Multi-select / choice question types
- Interview link hardening (column-level RLS or separate table)
- Rate-limiting on WhatsApp link reveal
- Waitlist status enum value
- Cross-flow account merge (email/password vs Google OAuth same-email)
- Change-password link from `/profile` settings entry point
- PDF export / recruitment reports
- Admin preview-as-applicant for interview link
- Filter tabs on admin drive list

---

## Deferred items catalog (step-assigned)

**Step 18 — Post-17 maintenance sweep:**
- Drop `updateRecruitment` action (dead after 16A Batch 3b)
- Drop `startNewRecruitment` action (dead after 16A Batch 3b)
- Drop `getApplicationHistoryForClub` and `RecruitmentHistoryGroup` (dead after 16B Batch 2b)
- Drop `getMyProfileClubs` (dead after 17A — reverted the 14f unification)
- Drop `applications.note`, `note_by`, `note_at` columns + FK (dead after 16B addendum 1)
- Regenerate `database.types.ts` via `supabase gen types`
- Sweep `note_author:profiles!applications_note_by_fkey(...)` embedded joins (already stripped in post-16B cleanup — verify no reintroduction)

**Step 19 — Post-deploy P0/P1 security:**
- `safeNext()` protocol-relative URL bypass (`//evil.com` starts with `/`)
- Year-impersonation defense (snapshot `applicant_year` on applications at apply time + rate-limit `profile.year` edits)
- Signout GET → POST (CSRF hardening)

**Step 20 — Question-edit data integrity:**
- Snapshot `q.prompt` onto `applications.responses[q_id]` at submit-time (responses become `Record<question_id, { prompt, answer }>` or parallel `response_prompts` object)
- Applicant notification on drive edit (email via Resend, debounced per edit session)
- Admin soft-warning banner when editing drive fields with `applicant_count > 0`
- Consider blocking question edits during Open phase when responses exist

**Step 21 — Public club pages + club_team + role hierarchy:**
- Curated `club_team` display on `/clubs/[slug]`
- Enhanced About / Events / Gallery integration
- Design refresh
- Per-club role hierarchy customization UI — clubs configure their own labels for each structural role

**Step 22 — Events refactor:**
- Event RSVP / attendance tracking
- Digital event submissions with Google Drive integration
- Event-level file uploads from students

**Step 23 — File submissions on drives:**
- Drive-creation option: "Enable file uploads"
- Applicant file uploads as part of application
- Google Drive integration (shared infra with step 22)
- Admin review sees files
- Use case: motorsports/tech drives asking for portfolios

**Step 24 — Members CSV import:**
- CSV: full_name, email, roll_number, year, branch, role (member), admin_tier (admin), club_slug
- Two writes per person if both member + admin
- Idempotent, safe re-runs
- Roll number → profile matching with fuzzy fallback

**Step 25 — Compute `clubs.is_recruiting` from drives:**
- Drop the column
- Update ~10 consumers via grep sweep
- Compute from any drive in Open phase for the club

**Step 26 — Year update mechanism:**
- Semester-based (2 sems per year)
- Student sets starting sem + progress on profile completion
- Auto-counter periodically bumps year
- Manual override for early-finish cases
- Pairs with step 19 year-impersonation defense

**Step 27 — UI/UX polish pass:**
- Mobile redesigns
- Restore club-card aesthetic broader
- Accent color decision (terracotta vs honey vs sage)
- Badge system on profile

---

## Working approach

### Build cadence
- Incremental, step-ordered. Each step ships `SETUP_STEP*.md` + file map + run instructions + smoke test path.
- Sub-steps split into batches when file count > ~10 (16A Batch 3a/3b, 16C Batch 1/2 pattern).
- Re-output only files that actually change. Prefer PATCH markdown over full REPLACE when file state may diverge.
- Terse explanations — code + run instructions, minimal prose.
- Complex reconciliation handed to Claude Code in VS Code.
- Grep sweep before deletion — every removed export needs `grep -rn` confirmation of zero consumers.

### File-shipping conventions
- Flat output uses `__` as path separator (e.g. `marketing__page.tsx` = `app/(marketing)/page.tsx`)
- Reserved Next names exact: `page.tsx`, `layout.tsx`, `route.tsx`, `proxy.ts`
- Helper/component files preserve real paths
- Setup file always `SETUP_STEP<N>.md`

### Dev recipe
- Clear `.next` after migrations
- `npx tsc --noEmit` after batch file drops
- `grep -rn "<dropped column>" lib/ components/ app/` after dropping any column
- Confirm `grep "^export" lib/queries/<file>.ts` matches consumer imports

### Result type convention
- Flat `{ ok?: boolean; error?: string; ...extras }` — NOT discriminated unions
- Matches `ReviewResult`, `AuthResult`, `GalleryResult`, `DriveResult`
- Client watches `isPending` transitions for success, not `state.ok` (sticky across successful dispatches — Lesson 20)

### Manual SQL maintenance reference

```sql
-- Force-clear a publish stamp
update recruitments set results_published_at = null, results_published_by = null
where id = '<drive_uuid>';

-- Manually flip an application status (bypass trigger via GUC)
select set_config('app.bypass_phase_check', 'true', false);
update applications set status = 'removed' where id = '<uuid>';

-- Find all triggers on a table
select trigger_name, action_statement from information_schema.triggers
where event_object_table = 'applications';

-- Check column type before writing SQL casts
select column_name, data_type, udt_name from information_schema.columns
where table_name = 'club_admins' and column_name = 'admin_role';

-- Audit log recent activity
select action, target_club_id, target_profile_id, details, created_at
from audit_log order by created_at desc limit 20;

-- Drives without interview link (post-16C — should be zero for published drives)
select id, name from recruitments
where interview_whatsapp_link is null and published_at is not null;
```

---

## Lessons (baked in)

1. **RLS is a safety net, not a query filter.** Always explicit `.eq("profile_id", user.id)` / `.eq("club_id", clubId)`. *(9a applications-leak bug.)*

2. **GRANTs and RLS are two separate layers.** Every new table needs both. *(9b club-edit bug.)*

3. **Verify trigger/constraint/function names against `information_schema` before writing drops.** *(9f-1 trigger error.)*

4. **Migrations need to disable downstream triggers during data moves.** Wrap in `alter table X disable trigger T` / `enable trigger T`. *(9f-1 migration crash.)*

5. **When rewriting files after a migration, preserve export surfaces.** Surgical internal edits, not full rewrites. *(9f-1 aftermath dropped exports.)*

6. **`cookies()` cannot be used inside `generateStaticParams`** (Next 16 strict). Use `createStaticClient()`.

7. **Nested `<form>` elements cause hydration errors.** Modals containing forms must render outside any parent `<form>`. *(9f-2 club-edit; regressed in 17A Batch 1 Addendum 1 — see Lesson 23.)*

8. **Navbar auth check must use the right authority source.** Authority lives in `club_admins`, not `profiles.role`. *(9b.)*

9. **Three-phase recruitment model prevents stale membership state.** Membership materializes at publish, not accept-click. *(9d fixes.)*

10. **A `.ts` file containing JSX errors as "Unterminated regexp literal."** TS parser sees `<Foo>` and tries generic/regex. Rename to `.tsx`. *(12c format.tsx.)*

11. **PostgreSQL parameter naming collides with role reserved words.** `current_role` returns `'authenticated'`, not your local variable. Use `target_role`, `actor_role`. *(12b set_super_admin bug.)*

12. **Supabase generated types lag behind schema changes.** Use `as never` cast as escape hatch when RPC signatures change. Regenerate when convenient. *(16A Batch 2, 17A.)*

13. **Draft filter must be applied everywhere.** After adding `published_at NULL = draft` semantics, every "most-recent recruitment" query needs `.not("published_at", "is", null)`. Grep before ship. *(16A Batch 1.)*

14. **Phase-consuming actions must SELECT `published_at`.** `getPhase()` checks `!published_at → draft` first; missing column silently misclassifies as draft. *(16B addendum 2.)*

15. **Publication-based masking beats phase-based masking for status.** Mask on `!results_published_at`, not `phase === "review"`. Preserves invariant across deadline-extension roundtrips. *(17A addendum 3.)*

16. **Grants co-located with RPC definitions.** Every `create or replace function` that authenticated users invoke needs `grant execute` in the same migration file. Split-file grants get lost in `drop function if exists` rewrites — silent auth failures. *(16C Batch 1 Round 2.)*

17. **Shape-change traps in transactional SQL functions.** When schema shape changes (e.g. `applications.responses` from hardcoded keys to `Record<question_id, string>`), grep for ALL SQL functions that touch that shape. `publish_recruitment_results` had a legacy sync-flip block that silently broke — `published_at` flipped, member materialization skipped. *(16C Batch 1 Round 2.)*

18. **Two-tab auth flows: architecture patterns.** Four recurring decisions when building email round-trip auth:
    - **Cross-tab session detection.** `@supabase/ssr` caches session in memory and does NOT auto-re-read cookies. Polling for another tab's session update needs explicit `refreshSession()` before every `getUser()`. Add `focus` + `visibilitychange` listeners.
    - **PKCE origin binding.** The `code_verifier` cookie is bound to the origin where signup happened. Sign up on `localhost:3000` + click a link redirecting to production → silent failure. Redirect URLs allowlist must include every origin.
    - **Two-tab direction depends on which tab has real work.** Passive (verification): Tab B → static ack page; Tab A navigates. Active (password reset — user types new password): Tab B → the form; Tab A is passive.
    - **Encode mode in URL at entry-point action.** For a page serving two modes, pass `?recovery=1` from the initiating action, don't detect session shape server-side.
    *(15c/15d — 10 debug rounds combined.)*

19. **Auth implementation gotchas.**
    - **Effect race with cleanup + stale closure.** `useEffect` that sets state AND has cleanup mutating a captured variable used by `setTimeout` creates a stale-closure race. Fix: split into worker effect (empty deps + `useRef`) + reaction effect (state deps).
    - **`require_current_password_when_updating` requires the reauthenticate flow.** Not satisfied by `signInWithPassword` before `updateUser`. Implement `reauthenticate()` + `updateUser({ nonce })`, or disable and use your own check.
    - **Shared password visibility state is a UX bug.** Multiple password inputs bound to same `type={show ? "text" : "password"}` all reveal together. Extract per-field `PasswordField`.
    *(15c/15d.)*

20. **Server/client boundary and React state discipline.**
    - **Pure helpers don't belong in `"use client"` modules.** Every export from a `"use client"` file becomes a client-only reference; server components can't call them during render. Extract to plain `lib/*.ts`.
    - **`useActionState`'s state is sticky across successful dispatches.** If you need something to fire on every completed save, watch `isPending` transitions with a `useRef`, not `state.ok`.
    - **`<input type="datetime-local">` submits timezone-less strings.** Pair with `timestamptz` column shifts by user's TZ offset. Pattern: visible state-driven input (no `name`) + hidden `<input name>` with `new Date(state).toISOString()`.
    *(16A Batch 3b — 3 refinement rounds.)*

21. **Grants and RLS bite even on read-only joins.** Anon-facing queries with embedded selects across authenticated-only tables materialize as Postgres JOINs, respecting caller's role grants — not just RLS. Public-facing queries embedding restricted tables fail with `permission denied`. Fix: two-query pattern (parent list + scoped follow-up), NOT granting SELECT to anon. Supabase's error hint suggesting `grant select ... to anon` is nearly always wrong for public paths. *(16B Batch 2a.)*

22. **Don't defer consumer-side wiring on the assumption "full solution needs schema changes."** Check whether the data is already reachable via existing relations. Deferring what's already possible produces silent-bug windows where the setter side works but readers stale. *(17A Addendum 1 — drive-scoped community link resolution deferred to 17B unnecessarily; `applications` already had enough info to derive source drive at query time. Two-query pattern in `getMyMemberships` fixed it without new columns.)*

23. **Repeated Lesson 7 violations mean the check isn't automated.** Nested forms bit again in 17A despite Lesson 7 being explicit. When adding conditional forms inside a component that already has a parent form, grep the file first: `grep -B5 -A5 "<form" file.tsx`. Better: extract conditional forms as top-level siblings of the parent form. *(17A Batch 1 Addendum 1.)*

24. **Anchor patches by function names, not line numbers.** Files evolve; line numbers drift. Patch docs should describe anchor block content, not "line 42". Prefer PATCH markdown over full REPLACE when file state may diverge from context.

---

## Recent design references

**Admin dashboard club card design** at `app/(admin)/admin/page.tsx` — visual reference for My Clubs cards (17A) and future member cards.

**Modal component** at `components/ui/modal.tsx` — accepts `className` prop for width variants (`max-w-sm` default, `max-w-xs` for popups, `max-w-2xl` for review modals).

**WhatsAppLinkButton** at `components/ui/whatsapp-link-popup.tsx` — reusable across application row (interview link), My Clubs card (community link), club detail aside (community link, member-only). Size prop `sm` (32px) or `md` (40px).

**MyClubsList** at `components/profile/my-clubs-list.tsx` — 2-col responsive grid, quick-link chips (Home, Events, Instagram, WhatsApp), tooltip labels. Blueprint for future member-list card design.

---

## Open small flags (not blocking)

- Real photos, font polishing deferred to step 27
- `useUser` hook can briefly flip to "not logged in" on transient network errors — deferred
- Mobile-specific section redesigns deferred to step 27
- `interview_whatsapp_link` and `community_whatsapp_link` readable by anon on `recruitments` — worst case a determined attacker joins a group; admin can kick. Hardening in backlog (column-level RLS or separate table)
- Google OAuth console setup pending (code path done since step 6)
