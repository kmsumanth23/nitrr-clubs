# NITRR Clubs — CLAUDE.md

The living source of truth for the NIT Raipur clubs & committees website rebuild. Update after every milestone.

🚀 **Live at https://nitrr-clubs.vercel.app/** (since 2026-06-17)

---

## What we're building

A modern full-stack rebuild of the NIT Raipur clubs/committees website. Replaces an aging Create React App + Redux + static HTML project. Two purposes:

1. **A real production site** for NITRR clubs — public landing, club pages, events, gallery, recruitment workflow.
2. **A learning project** in parallel — HLD/LLD, SSR/CSR rendering strategies, RLS, migrations, CI/CD, eventually containerization and orchestration.

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
- Vercel hosting, GitHub Actions CI (PR-only)
- ESLint + Prettier

**Next 16 quirks worth knowing:**
- `middleware.ts` is renamed `proxy.ts`; export named `proxy`.
- `cookies()` cannot be used inside `generateStaticParams` (runs at build time). Use `lib/supabase/static.ts` → `createStaticClient()`.
- `useFormState` is deprecated; use `useActionState` from React 19.
- Turbopack default bundler; clear `.next` after migrations.

**Path aliases:** `tsconfig.json` aliases `@/lib/supabase/server` → `./lib/supabase/supabase__server.ts` so imports stay short despite the `__`-flat filename convention.

**Auth:** Supabase Auth via email/password. (Google OAuth code path exists from step 6 but console setup deferred indefinitely; email-only is sufficient for NITRR institutional use.) Sessions in HttpOnly cookies, not localStorage. **Multi-account testing requires separate incognito windows per account.**

---

## Production

- **URL:** https://nitrr-clubs.vercel.app/
- **Hosting:** Vercel (free tier; auto-deploys from `main`)
- **Database:** Supabase production project (single project; no staging)
- **CI:** GitHub Actions on PRs (typecheck + lint + build)
- **Monitoring:** Vercel built-in logs
- **Branch protection:** off (single-dev project; revisit at handover time)
- **DEPLOY.md** at repo root has the full deploy walkthrough + smoke test path

Future learning track (not blocking real use):
- Migrate to Mumbai/Singapore Supabase region for lower IN latency
- Containerization + orchestration as DevOps learning exercise
- Grafana for monitoring as enterprise practice
- Multi-env (staging + prod separation) for the containerization story

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

## Database schema (current after 12c)

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
```

### Key SQL functions

**Recruitment lifecycle:**
- `recruitment_phase(uuid) → 'open' | 'review' | 'result'`
- `current_recruitment_for_club(uuid) → uuid`
- `enforce_application_phase()` trigger — honors `app.bypass_phase_check = 'true'` GUC for legitimate admin operations
- `publish_recruitment_results(uuid)` — lead-only, gated on zero pending/reviewing, **writes audit_log**
- `start_new_recruitment(...)` — lead/manager
- `remove_member(uuid, uuid)` — SECURITY DEFINER, lead/sysadmin only, **writes audit_log**

**Admin management (12a):**
- `can_manage_club_admins(uuid)` — true for lead of that club OR sysadmin
- `add_club_admin(uuid, uuid, text)` — lead+/sysadmin, writes audit_log
- `remove_club_admin(uuid, uuid)` — lead+/sysadmin, blocked by last-lead protection, writes audit_log
- `change_club_admin_tier(uuid, uuid, text)` — lead+/sysadmin, writes audit_log

**Sysadmin (12b):**
- `set_super_admin(uuid, boolean)` — sysadmin only, can't demote self if last
- `create_club(text, text, uuid, uuid)` — sysadmin only, atomic with initial lead
- `decommission_club(uuid)` / `restore_club(uuid)` — sysadmin only
- `count_clubs_without_admins() → int` / `recruitments_overdue() → table(...)` — anomaly helpers

**Gallery:**
- `can_manage_gallery(uuid)` — any club admin tier
- `club_id_from_slug(text) → uuid` — used by Storage RLS

**Auth helpers:**
- `is_super_admin()`, `can_edit_club_content(uuid)`, `can_manage_applications(uuid)`, `can_manage_admins(uuid)`, `club_tier(uuid)`, `is_club_admin(uuid)`

### Audit log

Append-only — no edits, no deletes, no UI to clear. RLS: sysadmin reads everything; lead/manager reads entries with `target_club_id` matching a club they admin.

**Action → viewer category mapping** (see [lib/audit/categorize.ts](lib/audit/categorize.ts)):

| Category pill | SQL `action` values |
|---|---|
| Club admins | `add_club_admin`, `remove_club_admin`, `change_club_admin_tier` |
| Clubs | `create_club`, `decommission_club`, `restore_club` |
| Super admins | `set_super_admin` |
| Members | `publish_results`, `remove_member` |

Club content edits (description, social links, member count) are intentionally NOT logged — too noisy, low value.

**Viewer pages:**
- `/admin/sysadmin/audit` — system-wide, with a per-club dropdown filter
- `/admin/clubs/[slug]/audit` — scoped to one club, no club picker

Both use cursor pagination on `created_at desc`, 50 rows/page. Prev simply resets to page 1 (no cursor stack — v1 simplification).

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

Status semantics: pending / reviewing / accepted / rejected / withdrawn / removed. **Status masked from student during review phase** — they see "Under review" until publish. Enforced in `application-row.tsx` via `displayStatus`.

---

## Routes & rendering strategy

| Group | Routes | Strategy |
|---|---|---|
| `(marketing)` | `/`, `/clubs`, `/clubs/[slug]`, `/events`, `/events/[slug]`, `/gallery`, `/about`, `/faq`, `/contact` | ISR for home/clubs/events; SSG for about/faq. Archived clubs filtered out. |
| `(marketing)` | `/clubs/[slug]/apply` | SSR with auth gate |
| `(auth)` | Sign-in modal + `/auth/callback` | client |
| `(student)` | `/profile` | SSR with auth gate |
| `(admin)` | `/admin`, `/admin/clubs/[slug]/...` | SSR with auth + tier gate |
| `(admin)` | `/admin/sysadmin/...` | SSR with sysadmin gate |
| `(admin)` | `/admin/api/export/*` | GET handlers (CSV downloads) |

Auth gate pattern: route group's `layout.tsx` does session check → query hits RLS as second gate.

---

## Per-club admin pages

| Path | Who can view | Who can edit |
|---|---|---|
| `/admin/clubs/[slug]` (Edit) | Any admin tier + sysadmin | Manager + Lead + Sysadmin |
| `/admin/clubs/[slug]/events` | Any admin tier + sysadmin | Same |
| `/admin/clubs/[slug]/recruitment` | Manager + Lead + Sysadmin | Same |
| `/admin/clubs/[slug]/applications` | Manager + Lead + Sysadmin | Same |
| `/admin/clubs/[slug]/members` | Manager + Lead + Sysadmin (view); Lead + Sysadmin (remove) | — |
| `/admin/clubs/[slug]/admins` | Any admin tier (view); Lead + Sysadmin (manage) | — |
| `/admin/clubs/[slug]/gallery` | Any admin tier | Same |
| `/admin/clubs/[slug]/audit` | Manager + Lead + Sysadmin | — |

Sysadmin paths under `/admin/sysadmin/`: landing, super-admins, create-club, archived, audit, export.

Recruitment lifecycle (deadline, result_date, is_recruiting toggle, "Start new recruitment") lives on its own page. The two have separate save semantics: `updateClubContent` touches only `clubs`; `updateRecruitment` touches the current `recruitments` row + `clubs.is_recruiting`.

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
- **12c:** Audit log viewer (system-wide + per-club, cursor-paginated) + CSV exports (per-club roster, all-members, all-admins) with optional PII anonymization; `publish_recruitment_results` and `remove_member` now write audit entries
- **13a:** Production prep — CI workflow, DEPLOY.md, preflight SQL, README, .env.example
- **13b:** **Deployed to https://nitrr-clubs.vercel.app/** ✅
- **Post-deploy Claude Code analysis:** Comprehensive audit run; findings catalogued below in "Known issues from post-deploy audit." The fix attempt was reverted (see lesson 18); fixes will be applied carefully in future steps when each item naturally fits.
- **Post-deploy cleanup (single change kept from revert):** `components/layout/faulty_navbar_admin_not_rendering.tsx` deleted (dead 215-line file, zero imports)

### Left

| Step | Description |
|---|---|
| **14** | Content management — FAQ editor, category editor, activity feed, storage usage report, recompute counters (scope to be discussed before shipping) |
| **15** | Notifications + comms (email via Resend, banner system, site config flags) |
| **16** | Year-restricted positions + per-position custom questions + WhatsApp link reveals |
| **17** | Advanced data export (PDF, per-cycle reports, annual reports, JSON backup) |
| **18** | Polish + extras — most P0/P1 from post-deploy audit fold in here (security fixes, signup flow, etc.) |
| **19** | UI/UX pass (mobile redesigns, restore club-card style on /profile, accent color decision, badges, loading indicators) |

Step 16 was originally numbered 11 — it's the year-restricted positions feature. Pushed back because it benefits from real-world user feedback first (deploy → users → step 16).

---

## Known issues from post-deploy audit

Findings from the comprehensive analysis pass (post-13b). Not blocking real use; will be addressed item-by-item in future steps when each one naturally fits a focused session, with proper in-session testing rather than autonomous batch fixes (see lesson 18).

### Security (high priority — handle individually with care)
- **Profile-search filter injection** (`lib/queries/profile-search.ts:33-42`) — User-supplied `q` is concatenated unsanitised into a PostgREST `.or()` filter. Typing `,role.eq.super_admin` injects extra OR conditions. RLS still applies so it's not privilege escalation, but admins could craft queries to leak fields. **Fix when:** addressing profile-search UX (any step that touches this code).
- **`searchProfiles` action has no explicit authority pre-check** — Relies entirely on RLS for gating. Per lesson 1 ("RLS is a safety net, not a query filter"), needs an explicit auth check. **Fix when:** the filter injection fix happens (same file).
- **`/auth/signout` is a GET handler that mutates** — Link prefetchers and previewers could silently sign users out. **Fix when:** safe to touch the navbar (probably step 19 UI/UX pass, since navbar form rewrite is touchier than it sounds).

### Performance (perceived speed)
- **N+1 query on admin dashboard** — `getMyAdminClubs` in `lib/queries/admin.ts:117-151` fires 2 queries per club. 18 clubs = 36+ round-trips. Replace with grouped `IN (...) group by club_id` queries. **Fix when:** any step that touches admin dashboard queries (likely step 14).
- **No `loading.tsx` route segments** — Every navigation shows blank screen during SSR. Add skeletons for `/admin`, `/clubs/[slug]`, `/events/[slug]`, `/profile`. **Fix when:** step 19 UI/UX pass (skeleton design is part of the visual system).
- **`window.location.reload()` in 12 components** — Hard-reloads after every admin mutation; should be `router.refresh()`. Touches all admin rows + modals. **Fix when:** step 18 polish (carefully, since the modal `useEffect` pattern is intertwined).
- **Unbounded queries** on `getAllEvents` and `getAllGalleryPhotos` — Time bomb as content grows; not urgent now. Add `.limit(200)` + filter archived clubs' events. **Fix when:** step 14 if convenient, else step 18.

### Accessibility (group as a single pass later)
- Modal lacks focus trap, `aria-labelledby`, focus restore — migrate to Radix Dialog (already in stack via shadcn/ui)
- Gallery lightbox has no Escape-to-close, no `role="dialog"`, no close button
- Landing-page club cards: highlights only visible on hover (invisible on touch devices)
- Form status messages have no `aria-live` region (screen-reader silent on save/error)
- **Fix when:** dedicated a11y session, probably folded into step 19 UI/UX pass

### UX dead-ends
- **Post-signup flow broken** — Redirects to `/profile/complete` which requires session, but Supabase email-confirmation flow means user has no session yet. Hits `user!` non-null assertion. **Fix when:** before sharing site with new users (anywhere, but soon).
- **No email-verification landing page** — Clicking verification link drops user on homepage with no confirmation. **Fix when:** with the signup flow fix above.
- **"Publish results" panel shows with zero applications** — Confusing for leads on empty cycles. Two-line conditional fix. **Fix when:** anywhere convenient (step 14 if touching applications page).

### Code quality (defer indefinitely or fold opportunistically)
- 40 `any` casts on Supabase joins — root cause is Supabase JS join-syntax typing; not worth fixing
- ~28 modal `useEffect` post-action lint warnings — Group E from lint analysis; needs system-wide refactor pass, deferred
- `nullable()` helper duplicated in 3 files — 3 lines × 3, not worth a focused fix
- Auth-check pattern repeated across server actions/routes — extract `canManageClub(clubId, tiers[])` helper when convenient; not urgent
- Magic numbers scattered (page sizes, resize dimensions) — bikeshed, leave alone

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

5. **When rewriting files after a migration, preserve export surfaces.** Surgical internal edits where columns moved, not full rewrites from scratch. *(9f-1 aftermath dropped getCategories, getAllClubSlugs, etc.; 12c members-page reconstruction dropped prop signature.)*

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

16. **A `.ts` file containing JSX errors as "Unterminated regexp literal."** The TS parser sees `<Foo>` and tries to interpret `<` as a generic / comparison / regex delimiter. The fix is renaming to `.tsx`, not editing the JSX. Imports are usually extensionless so the rename is transparent. *(12c lib/audit/format.tsx misnamed.)*

17. **Next.js App Router route handler files are always named `route.ts`.** The directory tree expresses the URL; the file name expresses the verb. The `__` flat-naming convention applies to pages/layouts/middleware; route handlers must use literal `route.ts` in their final segment. Mis-named files become utility modules silently (the route doesn't exist; calls 404). *(12c — all three export routes shipped as `club-roster.ts` etc. and silently broke.)*

18. **Working production code beats theoretically-better code; auth-touching fixes need in-session iteration, not autonomous batches.** The post-deploy fix attempt bundled 3 auth-adjacent changes (profile-search sanitization, authority pre-check, signout GET→POST) plus dead code + lint cleanup into one autonomous Phase 1. Result: signout and profile-search both broke; full revert required. Auth flows have subtle failure modes that aren't visible in diff review — they need actual in-browser smoke tests after each individual change. **Rule:** when fixing working production code, do ONE change per session, smoke-test in browser, then move on. Batch fixes are fine for hygiene (lint, dead code, formatting); they don't work for behavior-changing code. The post-deploy audit findings are valuable as a known-issues catalog (see section above); apply fixes one at a time when each naturally fits a session.

19. GRANTs and RLS are two layers — but the discipline is checking, not just remembering. Lesson 2 was already in the book when 14a shipped, but the migration forgot the grant select, insert, update, delete on faqs/categories to authenticated. RLS denial returns "row level security policy violation"; missing GRANT returns "permission denied for table X". The error wording differs, so triage by reading the message carefully. When adding a new admin write surface to a previously read-only table, always grant the role + add the RLS policy in the same migration. (14a faqs/categories write-permission denial.)


20. Verify shared component APIs before consuming them in new code. The Modal component uses onClose: () => void, not the Radix-style onOpenChange: (next: boolean) => void. Writing new modal consumers based on what the API "should be" (e.g. what we'd migrate to in a planned refactor) causes build errors when the refactor hasn't happened. Before writing a new consumer, grep components/ui/<name>.tsx and check the actual props interface. (14a form modals shipped with onOpenChange + title props that didn't exist.)

### File-shipping conventions
- Flat output uses `__` as path separator (e.g. `marketing__page.tsx` = `app/(marketing)/page.tsx`)
- Reserved Next names exact: `page.tsx`, `layout.tsx`, `route.tsx`, `proxy.ts`
- **Route handler files always end with literal `route.ts`** — directory expresses URL, file expresses verb
- **JSX always `.tsx`** — even helper modules that return React nodes
- Helper/component files preserve real paths
- Setup file always `SETUP_STEP<N>.md`

### Dev recipe
- Clear `.next` after migrations
- `npm run typecheck` after batch file drops
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

## Smoke test reference (post-9f, post-12, post-deploy)

End-to-end recruitment cycle test (catches most regressions in ~5 min):

1. As Gladiator: `/admin/clubs/shaurya` → Recruitment page shows phase + form. If last recruitment published, "Start new recruitment" button visible. Click → modal → set deadline ~2 min future, result_date ~5 min future.
2. As Recruit (incognito 2): `/clubs/shaurya` → Apply enabled. Submit → `/profile` shows under Active with Pending.
3. Wait for deadline. Refresh both.
4. As Recruit: status now "Under review", view modal says locked.
5. As Gladiator: `/admin/clubs/shaurya/applications` → phase banner says Review. Accept Recruit.
6. As Recruit: refresh → still "Under review" (masked). My clubs empty.
7. As Gladiator: publish panel → confirm → publish.
8. As Recruit: refresh → status "Accepted" (now in History since published). Shaurya in My clubs.
9. As Gladiator: `/admin/clubs/shaurya/members` → Recruit in roster. Click Remove → confirm.
10. As Recruit: refresh → Shaurya gone. Old app shows "Removed" in History.
11. Audit log check: `/admin/sysadmin/audit` → entries for accept + publish + remove visible.

---

## Open small flags (not blocking, deferred)

- **Site speed.** See "Known issues from post-deploy audit" → Performance section. Loading indicators + N+1 fix are biggest wins; defer to step 18 + step 19 with careful per-item testing.
- **Modal post-action `useEffect` pattern triggers ~28 lint warnings** (`react-hooks/set-state-in-effect`). Pattern works correctly but isn't React Compiler-optimal. System-wide refactor pass deferred (post-deploy fix attempt confirmed this needs its own focused session, not a folded-in cleanup).
- Super_admin shows generic "Lead" tag on clubs they don't formally admin — should show distinct "Super_admin" badge (cosmetic, UI/UX pass)
- `useUser` hook can briefly flip to "not logged in" on transient network errors — should preserve previous state (defer to polish pass)
- My clubs section on /profile renders as plain inline list — club-card aesthetic to be restored in UI/UX pass
- Mobile-specific section redesigns deferred
- Real photos, font polishing deferred
- Google OAuth console setup pending (code path done since step 6; not blocking for v1 — email-only auth is sufficient)
- 16 seed clubs without admins (WARN from preflight) — leave as-is until NITRR onboarding assigns coordinators