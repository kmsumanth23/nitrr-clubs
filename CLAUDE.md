# NITRR Clubs — CLAUDE.md

The living source of truth for the NIT Raipur clubs & committees website rebuild. Update after every milestone.

🚀 **Live at https://nitrr-clubs.vercel.app/** (since 2026-06-17)

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
| `clay` | `#C26A4A` (warm accent; also used for destructive/decommissioned UI) |

Fonts: Bricolage Grotesque (display), Geist Sans (body). UI/UX polish deferred to a focused pass (step 19).

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

## Database schema (current after 14f)

```
profiles (id PK, email, full_name, role enum [student|admin|super_admin],
          roll_number UNIQUE NULLS NOT DISTINCT,  -- 14c added uniqueness
          year, branch, gender, created_at)

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
  -- 14a added sysadmin write RLS policy + write GRANTs

audit_log (id PK, actor_id FK, action text, target_club_id FK,
           target_profile_id FK, details jsonb, created_at)
  -- append-only, written by admin SQL functions
```

### Key SQL functions

**Recruitment lifecycle:**
- `recruitment_phase(uuid) → 'open' | 'review' | 'result'`
- `current_recruitment_for_club(uuid) → uuid`
- `enforce_application_phase()` trigger — honors `app.bypass_phase_check = 'true'` GUC for legitimate admin operations
- `publish_recruitment_results(uuid)` — lead-only, gated on zero pending/reviewing; writes `publish_results` audit entry with `members_added` count (12c)
- `start_new_recruitment(...)` — lead/manager
- `remove_member(uuid, uuid)` — SECURITY DEFINER, lead/sysadmin only; writes `remove_member` audit entry (12c)

**Admin management (12a):**
- `can_manage_club_admins(uuid)` — true for lead of that club OR sysadmin
- `add_club_admin(uuid, uuid, text)` — lead+/sysadmin
- `remove_club_admin(uuid, uuid)` — lead+/sysadmin, blocked by `protect_last_lead` trigger; trigger honors `app.bypass_last_lead_check = 'true'` GUC for legitimate cascade deletes
- `change_club_admin_tier(uuid, uuid, text)` — lead+/sysadmin

**Sysadmin (12b + 14):**
- `set_super_admin(uuid, boolean)` — sysadmin only, can't demote self if last
- `create_club(text, text, uuid, uuid)` — sysadmin only, atomic with initial lead
- `decommission_club(uuid)` — sysadmin only, sets `archived_at`
- `restore_club(uuid)` — sysadmin only, clears `archived_at`
- `delete_archived_club(uuid, text)` — sysadmin only (14d); requires archived first + slug confirmation; cascade-wipes all club data; uses `app.bypass_last_lead_check` GUC to bypass `protect_last_lead`; writes `permanent_delete_club` audit entry
- `count_clubs_without_admins() → int` — anomaly helper
- `recruitments_overdue() → table(...)` — anomaly helper

**FAQ + category editing (14a):**
- `swap_faq_order(uuid, uuid)` — sysadmin only; atomic swap of two FAQs' sort_order
- `swap_category_order(uuid, uuid)` — sysadmin only; same for categories
- `count_clubs_in_category(uuid) → int` — used for category delete guard

**Observability + diagnostics (14b):**
- `get_storage_usage() → table(...)` — sysadmin only; per-club photo count + bytes from `storage.objects`
- `get_largest_photos(bigint default 524288) → table(...)` — sysadmin only; photos > threshold (default 500 KB)
- `get_counter_drift() → table(...)` — sysadmin only; clubs where `member_count` ≠ actual `club_members` count

**Recompute counters (14c):**
- `recompute_member_count(uuid) → int` — sysadmin only; updates one club's `member_count` from actual roster count
- `recompute_all_member_counts() → int` — sysadmin only; bulk-fixes all clubs with drift; returns count fixed

**Gallery:**
- `can_manage_gallery(uuid)` — any club admin tier
- `club_id_from_slug(text) → uuid` — used by Storage RLS

**Auth helpers:**
- `is_super_admin()`, `can_edit_club_content(uuid)`, `can_manage_applications(uuid)`, `can_manage_admins(uuid)`, `club_tier(uuid)`, `is_club_admin(uuid)`

### Audit log

All admin-management actions write to `audit_log`. Append-only — no edits, no deletes, no UI to clear. RLS: sysadmin reads everything; lead/manager reads entries with `target_club_id` matching a club they admin.

**Action → viewer category mapping** (see [lib/audit/categorize.ts](lib/audit/categorize.ts)):

| Category pill | SQL `action` values |
|---|---|
| Club admins | `add_club_admin`, `remove_club_admin`, `change_club_admin_tier` |
| Clubs | `create_club`, `decommission_club`, `restore_club`, `permanent_delete_club` (14d) |
| Super admins | `set_super_admin` |
| Members | `publish_results`, `remove_member` |

Club content edits (description, social links, member count) are intentionally NOT logged — too noisy, low value. Recompute counter actions (14c) also NOT logged — they're reconciliations, not substantive changes.

**Viewer pages:**
- `/admin/sysadmin/audit` — system-wide, with a per-club dropdown filter
- `/admin/clubs/[slug]/audit` — scoped to one club, no club picker

Both use cursor pagination on `created_at desc`, 50 rows/page. Prev simply resets to page 1 (no cursor stack — v1 simplification).

Activity feed widget (14b) on `/admin/sysadmin` landing surfaces 7 most recent entries via the same `getAuditLog` query, with relative time and "See all →" link.

Querying directly:

```sql
select action, target_club_id, target_profile_id, details, created_at
from audit_log
order by created_at desc limit 50;
```

### CSV exports (12c)

Three GET route handlers under `/admin/api/export/`. All accept `?anonymize=1` to mask PII before download. Filename pattern: `{scope}_{YYYY-MM-DD}[_anonymized].csv`.

| Route | Authority | Output |
|---|---|---|
| `club-roster?slug=X[&anonymize=1]` | Any admin of X OR sysadmin | One file combining admins + members of one club. `Type` column distinguishes; admins also carry their `Tier`. |
| `all-members[?anonymize=1]` | Sysadmin only | All `club_members` system-wide with their clubs |
| `all-admins[?anonymize=1]` | Sysadmin only | All `club_admins` system-wide with their clubs + tier |

**Anonymization rules** (in [lib/csv/format.ts](lib/csv/format.ts)):
- Email: first char + `***` + domain (`sumanth@nitrr.ac.in` → `s***@nitrr.ac.in`)
- Roll number: first 4 chars + `***` (`21118270` → `2111***`)
- Year, branch: kept (demographic, not PII)

CSV escape follows RFC 4180 (`,`, `"`, `\n`, `\r` trigger quoting; internal `"` doubled). `\r\n` line endings for Excel/Sheets compatibility.

### Bulk import (14c)

GET `/admin/api/import/template` returns a CSV template (headers + one example row, sysadmin-only).

Page at `/admin/sysadmin/bulk-import` accepts CSV uploads (max 200 rows, 1 MB). Required columns: `name`, `category_slug`, `lead_roll_number`. Optional: `slug` (auto-derived from name), `tagline`, `description`. Lead profiles must exist first — bulk import doesn't create users. Per-row independent; report shows imported / failed with specific reasons.

CSV parser is inline at `lib/csv/parse.ts` — no dependency. Handles quoted fields with internal commas + escaped quotes. Does NOT handle multi-line quoted fields (single-line descriptions only).

---

## Recruitment lifecycle (the core model)

```
  ┌──────────┐   deadline    ┌────────────┐   publish    ┌──────────┐
  │   OPEN   │ ────────────▶ │   REVIEW   │ ───────────▶ │  RESULT  │
  └──────────┘   passes      └────────────┘  (lead-only) └──────────┘
   • student CRUD              • admin decides            • locked
   • no decisions              • student locked           • members materialized
                               • interview WhatsApp        from accepteds
                                 reveals (step 16)
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
| `(marketing)` | `/`, `/clubs`, `/clubs/[slug]`, `/events`, `/events/[slug]`, `/gallery`, `/about`, `/faq`, `/contact` | ISR for home/clubs/events; SSG for about/faq. Archived clubs filtered out of grids; `/clubs/[slug]` shows minimal decommissioned card (14f) with `noindex` if slug matches an archived club. |
| `(marketing)` | `/clubs/[slug]/apply` | SSR with auth gate |
| `(auth)` | Sign-in modal + `/auth/callback` | client |
| `(student)` | `/profile` | SSR with auth gate. My Clubs section (14f) unified — admin clubs + member clubs with role tag pill |
| `(admin)` | `/admin`, `/admin/clubs/[slug]/...` | SSR with auth + tier gate. Decommissioned clubs visible to all admin tiers with badge (14e); non-sysadmin admins see archived cards as read-only (no action chips) |
| `(admin)` | `/admin/sysadmin/...` | SSR with sysadmin gate (12b). New pages from 14: `/faqs`, `/categories`, `/storage`, `/diagnostics`, `/bulk-import` |
| `(admin)` | `/admin/api/export/{club-roster,all-members,all-admins}` | GET route handlers; in-route authority check; returns `text/csv` |
| `(admin)` | `/admin/api/import/template` (14c) | GET route handler; sysadmin only; returns CSV template |

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
| `/admin/clubs/[slug]/audit` (12c) | Manager + Lead + Sysadmin | — (read-only) |

The Edit page handles content only (name, tagline, category, description, highlights, member_count, community link, socials, danger zone). Recruitment lifecycle (deadline, result_date, is_recruiting toggle, "Start new recruitment") lives on its own page. The two have separate save semantics: `updateClubContent` touches only `clubs`; `updateRecruitment` touches the current `recruitments` row + `clubs.is_recruiting`.

For archived clubs: sysadmin can still access all sub-pages (sees existing "decommissioned" banner via `club-edit-form.tsx`). Non-sysadmin admins are blocked at `getEditableClub` — clicking through from the dashboard 404s, which is why the card is rendered non-clickable for them in 14e.

---

## What's done and what's left

### Done

| Step | Description |
|---|---|
| 1-4 | Scaffold, Supabase schema/RLS/seed/clients, design system + nav + footer, full landing page (10 sections) |
| 5 | Public clubs listing + detail pages |
| 6 | Auth (Google OAuth code path; console setup pending) |
| 7 | Public events pages |
| 8 | Gallery placeholder page |
| 9a | Student profile + applications list |
| 9b | Admin shell + edit-club + club_admins-based authority |
| 9c | Admin events CRUD + sidebar pill + unsaved-changes guard |
| 9d | Admin applications review |
| 9d-fixes | Three-phase model, publish RPC, status masking, membership-at-publish-only |
| 9e | Gallery upload (Supabase Storage, client-side resize, homepage opt-out) |
| 9f-1 | Recruitments table migration; data + queries + actions threaded through |
| 9f-2 | Start new recruitment + Remove member; GUC trigger bypass |
| 9f-3 | Active vs History split on /profile; Current/History tabs on admin applications |
| 12a | Per-club admin management UI (audit log table created, writes start here) |
| 12b | Sysadmin landing + super_admin management + create club + decommission/restore |
| 12b-refinement | Recruitment lifecycle moved out of Edit form into its own `/recruitment` page; `updateClub` split into `updateClubContent` + `updateRecruitment` for separate save scopes |
| 12c | Audit log viewer (system-wide + per-club, cursor-paginated) + CSV exports + PII anonymization; publish/remove_member now write audit entries |
| 13a | CI workflow, DEPLOY.md, preflight SQL, README, .env.example |
| 13b | Deployed to Vercel + Supabase Auth configured + smoke test passed |
| 14a | FAQ editor + Category editor (sysadmin CRUD), incl. atomic reorder RPCs, slug uniqueness, delete guards |
| 14b | Activity feed widget (sysadmin landing) + Storage usage report (per-club bytes, free-tier meter, photos > 500 KB) + Counter drift report |
| 14c | Recompute counters (per-club + bulk) + Bulk import clubs from CSV (lead lookup by roll_number) + Roll number uniqueness constraint |
| 14d | Permanent delete archived clubs with three-layer caution (button → modal → type-to-confirm slug) + Bulk import inline help |
| 14e | Decommissioned badges on /admin (all tiers) + /profile My Clubs; queries no longer filter archived |
| 14f | Public `/clubs/[slug]` shows minimal decommissioned card (was 404) + Profile My Clubs unified (admin + member clubs with role tag) |

### Left

| Step | Description |
|---|---|
| **15** | Resend email notifications (application result, admin assigned, welcome). 3 sub-steps. |
| **16** | Year-restricted positions + per-position custom questions + WhatsApp link reveals (originally numbered 11) |
| **17** | TBD candidates: event RSVP/attendance, recruitment workflow improvements (interview slots), member badges |
| **18** | Post-deploy P0/P1 security fixes (profile-search filter injection, signout GET→POST, signup flow, email verification landing) |
| **19** | UI/UX pass (Radix Dialog migration, `loading.tsx` segments, lightbox a11y, mobile redesigns, `window.location.reload()` migration, accent color decision) |

---

## Step 15 design (next up) — Resend email notifications

**Why Resend:** free tier 100/day + 3000/month, simple HTTP API, no SDK needed, good DX.

**3 sub-steps:**
- **15a** — Resend setup + Application result email (wired into `publish_recruitment_results`)
- **15b** — Admin role assignment email (wired into `add_club_admin` + `set_super_admin`)
- **15c** — Welcome email + sysadmin observability widget for recent sends

**Architecture decisions (locked):**
- Synchronous sends inside server actions (avoids queue infra)
- Plain HTML templates (no React Email dep)
- Fail-safe: email failures don't roll back the DB write — logged, not propagated
- No `email_log` table for v1 (Resend dashboard suffices)

**Decisions pending before 15a:**
- FROM address (likely `noreply@nitrr-clubs.vercel.app` — Vercel domains can be Resend-verified)
- Email tone (terse + functional preferred — see sample in 14 closure conversation)

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
- Auth-touching fixes: ONE change per session, smoke-test in browser before moving on (per Lesson 18).

### Lessons baked in

1. **RLS is a safety net, not a query filter.** Always explicit `.eq("profile_id", user.id)` / `.eq("club_id", clubId)`. RLS policies use OR semantics. *(9a applications-leak bug.)*

2. **GRANTs and RLS are two separate layers.** Every new table needs both. *(9b club-edit bug.)*

3. **Verify trigger/constraint/function names against `information_schema` before writing drops.** Never assume the name matches your migration SQL. *(9f-1 trigger error from lurking `enforce_application_deadline`; reinforced by 14d patching the wrong function name `prevent_last_lead_removal` instead of `protect_last_lead`.)*

4. **Migrations need to disable downstream triggers during data moves.** Wrap data mutation in `alter table X disable trigger T` / `enable trigger T`. *(9f-1 migration crash.)*

5. **When rewriting files after a migration, preserve export surfaces.** Surgical internal edits where columns moved, not full rewrites from scratch. *(9f-1 aftermath dropped getCategories, getAllClubSlugs, etc.)*

6. **`cookies()` cannot be used inside `generateStaticParams`** (Next 16 strict). Use `lib/supabase/static.ts` → `createStaticClient()`.

7. **Nested `<form>` elements cause hydration errors.** Modals containing forms must render outside any parent `<form>` in the DOM tree. *(9f-2 club-edit form.)*

8. **Navbar auth check must use the right authority source.** Authority lives in `club_admins`, not `profiles.role`. *(9b navbar bug.)*

9. **Three-phase recruitment model prevents stale membership state.** Membership materializes at publish, not accept-click. *(9d revert-from-accepted bug.)*

10. **Multi-account testing needs separate incognito windows.** Supabase auth in HttpOnly cookies, not localStorage.

11. **Custom Postgres GUCs (with dot prefix) don't need superuser privilege.** Use `set_config('app.bypass_phase_check', 'true', true)` for function-level signals to triggers. *(9f-2 remove_member trigger conflict; 14d cascade-delete bypass for protect_last_lead.)*

12. **Don't assume database types exist.** `club_admins.admin_role` is `text`, not an enum named `admin_tier`. Always verify the actual column type before writing casts in SQL. *(12a `admin_tier does not exist` error.)*

13. **SQL editor's `auth.uid()` is NULL.** Test functions via the app, not the SQL editor — the editor uses postgres role, not your user's JWT, so SECURITY DEFINER auth checks return false. *(Reaffirmed in 14b storage diagnostic.)*

14. **INSERT column/value counts must match.** Always count both lists before running. *(9f-2 start_new_recruitment off-by-one with created_by.)*

15. **Don't name plpgsql variables after PG-reserved identifiers.** `current_role`, `current_user`, `session_user`, `current_schema` are SQL keywords that resolve to builtins inside expressions even when shadowed by a local variable. The function compiles fine; the bug only shows up at runtime, where comparisons silently use the builtin (e.g. `current_role` returns `'authenticated'`). Name target variables `target_role`, `actor_role`, etc. *(12b set_super_admin demote-always-fails bug.)*

16. **A `.ts` file containing JSX errors as "Unterminated regexp literal."** The TS parser sees `<Foo>` and tries to interpret `<` as a generic / comparison / regex delimiter. The fix is renaming to `.tsx`, not editing the JSX. Imports are usually extensionless so the rename is transparent. *(12c lib/audit/format.tsx misnamed.)*

17. **Route handler filenames must be exact: `route.ts` not `route.tsx`.** Next.js routes a folder via its `route.ts` file; any other name is silently ignored. *(13a CI export endpoints initially named wrong.)*

18. **Working production code beats theoretically-better code; auth-touching fixes need in-session iteration, not autonomous batches.** The post-deploy fix attempt bundled three auth-adjacent changes and broke signout + profile-search, requiring full revert. Rule: ONE change per session, smoke-test in browser, then move on. Batch fixes OK for hygiene (lint, dead code); NOT for behavior-changing code.

19. **GRANTs and RLS are two layers — but the discipline is checking, not just remembering.** Lesson 2 was already in the book when 14a shipped, but the migration forgot the `grant select, insert, update, delete on faqs/categories to authenticated`. RLS denial returns "row level security policy violation"; missing GRANT returns "permission denied for table X". The error wording differs, so triage by reading the message carefully. When adding a new admin write surface to a previously read-only table, always grant the role + add the RLS policy in the same migration. *(14a faqs/categories write-permission denial.)*

20. **Verify shared component APIs before consuming them in new code.** The `Modal` component uses `onClose: () => void`, not the Radix-style `onOpenChange: (next: boolean) => void`. Writing new modal consumers based on what the API "should be" (e.g. what we'd migrate to in a planned refactor) causes build errors when the refactor hasn't happened. Before writing a new consumer, grep `components/ui/<name>.tsx` and check the actual props interface. *(14a form modals shipped with `onOpenChange` + `title` props that didn't exist.)*

21. **Inline arrow functions passed as callbacks to children with `useEffect` deps create infinite loops.** When a child's `useEffect` depends on a callback prop, every parent render creates a new function reference, the dep changes, the effect re-fires. If the effect's body triggers a state change in the parent (e.g. `router.refresh()`), it loops infinitely. Fix: wrap the callback in `useCallback` with stable deps. Pair with a `key` bump on the child when the child uses `useActionState` and you want fresh state on next open. *(14a FAQ + Category form modals — each submission caused continuous `router.refresh()` calls until navigation.)*

22. **`SUM(bigint)` returns `numeric`, not `bigint`.** Postgres widens aggregate results to avoid overflow. If a `RETURNS TABLE(... col bigint)` declares the column as bigint but the query has `sum(big_col)`, you get runtime error 42804 "Returned type numeric does not match expected type bigint" — and the error message points at row structure, not the offending expression. Always cast aggregate results back: `coalesce(sum(x), 0)::bigint`. Same applies to `avg`, which returns `numeric` for any input. *(14b storage report — by-club table was silently empty.)*

23. **Never silently default RPC errors to empty arrays.** The pattern `const rows = (res.data ?? []) as Row[]` treats query errors identically to empty results. A real failure (RLS denial, type mismatch, syntax error) becomes a silent empty table in the UI. Always inspect `.error` and log/surface it. At minimum: `if (res.error) console.error("rpc X failed:", res.error)`. Without this, debugging requires guesswork — the bug in 14b storage was invisible until logs were added. *(Same incident — sum()/numeric mismatch hidden behind silent error swallowing.)*

24. **Before writing any "REPLACE" file, search project knowledge for the actual current contents.** Pattern-matching from memory drops details (the exact `useActionState` + `useFormStatus` pattern, sub-components defined inline, exact prop signatures of shared components, real function names like `protect_last_lead` vs guessed `prevent_last_lead_removal`). Cost of search: one tool call. Cost of reconstruction-from-memory: regression bugs or wrong identifiers in SQL/code. When a change to an existing file is small and the file has unrelated content, prefer a focused PATCH over full REPLACE — it's safer and reads as more honest about what's actually being changed. *(14d archived-club-row.tsx reconstruction; 14d wrong trigger function name; 14f initial REPLACE-with-placeholder near-miss.)*

### File-shipping conventions

- Flat output uses `__` as path separator (e.g. `marketing__page.tsx` = `app/(marketing)/page.tsx`)
- Reserved Next names exact: `page.tsx`, `layout.tsx`, `route.ts`, `proxy.ts`
- Helper/component files preserve real paths
- Setup file always `SETUP_STEP<N>.md`

### SQL migration naming convention

- Through 9e: numbered prefix (`01_schema.sql` ... `09e_gallery.sql`)
- 9f through 14b: kept `09f-1`, `09g`, `09h`, `09i`, `09j` from inertia — semantically wrong; those covered step 12 and step 14 work
- **From 14c onward: step-aligned naming** (`14c_recompute.sql`, `14d_delete_archived.sql`, `15_resend_setup.sql`, etc.)

Don't rename existing files — too many references; would break the repo's history clarity. Just use the new convention for new migrations.

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

-- Cascade-delete a single club_admin row when last-lead trigger is in the way
select set_config('app.bypass_last_lead_check', 'true', false);
delete from club_admins where club_id = '<uuid>' and profile_id = '<uuid>';

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

-- Recompute member counts for all clubs at once (sysadmin only)
select recompute_all_member_counts();

-- Check storage usage by club (sysadmin only)
select * from get_storage_usage();

-- Find duplicate roll numbers (run before 14c migration if needed)
select roll_number, count(*) as duplicate_count
from profiles where roll_number is not null
group by roll_number having count(*) > 1;
```

---

## Deferred items catalog (from step 14 closure)

Features and improvements surfaced during step 14 but pushed forward. Single source of truth for step 15+ planning.

### Going to specific future steps

| Item | Where |
|---|---|
| Email notifications via Resend | step 15 |
| Year-restricted positions + WhatsApp reveals | step 16 |
| Modal pattern refactor (useActionState+useEffect) | step 19 |
| `loading.tsx` route segments | step 19 |
| Modal a11y (focus trap, aria, Esc) | step 19 |
| Lightbox a11y | step 19 |
| Form `aria-live` for status messages | step 19 |
| Post-signup flow / email verification landing | step 18 |
| /auth/signout GET→POST | step 18 |
| Profile-search filter injection (P0) | step 18 |
| searchProfiles authority pre-check (P0) | step 18 |
| `window.location.reload()` → `router.refresh()` migration | step 19 |

### Indefinite — revisit when needed

| Item | Trigger to revisit |
|---|---|
| Video uploads / external embeds | When clubs ask; favor YouTube embed (Path A) |
| Storage orphan detection | When bucket approaches free-tier limit |
| Last upload per club (storage observability) | If sysadmin wants to flag inactive clubs |
| Empty active clubs report (diagnostics) | Same |
| Profiles with missing data report | If signup-to-application gap becomes a problem |
| Hard output byte cap on image resize | If storage costs become a constraint |
| N+1 query optimization on admin dashboard | If page load >2s |
| Read-only archived club view for non-sysadmin admins | If admins complain about dead-end cards |
| Bulk import for events/members | When onboarding requires it |
| Multi-line CSV descriptions (papaparse) | If single-line constraint becomes a problem |
| "Admin clubs under My Clubs" with Admin tag (DONE in 14f) | ✅ shipped |
| Decommissioned club public treatment (DONE in 14f) | ✅ shipped |
| Decommissioned badge on /admin and /profile (DONE in 14e) | ✅ shipped |

### Explicitly not building

| Item | Why |
|---|---|
| Soft-undo for permanent delete | Permanent means permanent. Use Archive for reversible. |
| Bulk delete of archived clubs | Three-layer caution is the friction we want; one at a time. |
| Pre-creating profiles in bulk import | Requires service_role; security risk not worth it. |

### Code quality (defer indefinitely)

| Item | Notes |
|---|---|
| 40+ `any` casts on Supabase joins | Cosmetic; Supabase types are noisy. |
| ~28 modal useEffect lint warnings | Resolves when modal pattern refactors (step 19). |
| nullable() helper duplicated in 3 files | DRY pass; trivial. |
| canManageClub auth-check helper extraction | DRY pass; trivial. |

---

## Open small flags (not blocking, deferred)

- Super_admin shows generic "Lead" tag on clubs they don't formally admin — should show distinct "Super_admin" badge (cosmetic, UI/UX pass)
- `useUser` hook can briefly flip to "not logged in" on transient network errors — should preserve previous state (defer to polish pass)
- Mobile-specific section redesigns deferred
- Real photos, font polishing deferred
- Google OAuth console setup pending (code path done since step 6)
- Decommissioned card tint (cream/40 bg) on `/admin` + `/profile` is optional polish — can be stripped if you prefer identical appearance to active cards