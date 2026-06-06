# NITRR Clubs — CLAUDE.md

The living source of truth for the NIT Raipur clubs & committees website rebuild. Update after every milestone. Skim the top sections when sitting down to work; read the deep sections before touching the relevant area.

---

## What we're building

A modern full-stack rebuild of the NIT Raipur clubs/committees website. Replaces an aging Create React App + Redux + static HTML project. Two purposes:

1. **A real production site** for NITRR clubs — public landing, club pages, events, gallery, recruitment workflow.
2. **A learning project** in parallel — HLD/LLD, SSR/CSR rendering strategies, RLS, migrations, CI/CD.

Visual language reference: communitie.in/hyderabad. Borrowed in spirit, not 1:1.

---

## Architecture

**Modular monolith.** One codebase, one Next.js deployment, but deliberate internal boundaries: `lib/queries/`, `lib/actions/`, `lib/validation/`, `components/<area>/`, `app/(<group>)/`. RLS is its own enforcement layer beneath the queries. The "modular" part means we could split — say, the admin area into a separate service — without a rewrite. We probably never will. The structure exists so changes stay local to their area.

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
- `cookies()` cannot be used inside `generateStaticParams` (runs at build time). Use `lib/supabase/static.ts` → `createStaticClient()` for cookies-free queries from build context.
- `useFormState` is deprecated; use `useActionState` from React 19.
- Turbopack is the default bundler; `.next` cache cleanup occasionally needed after migrations.

**Auth:** Supabase Auth via Google OAuth + email/password. Sessions live in **HttpOnly cookies**, not localStorage. **Multi-account testing requires separate incognito windows per account.** Clearing localStorage does not sign anyone out.

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

**Fonts:** Bricolage Grotesque (display), Geist Sans (body).

**Vibe:** frosted-glass pill nav, rounded cards, heavy display type, gentle warm section rhythm, dark footer only. Frosted sidebar pill in admin views (hover-expands from icon strip to labels).

**Undecided:** the warm accent. Terracotta `#C26A4A` is current placeholder; honey `#E0A82E` and sage `#7C8C6A` are candidates. Resolved in UI/UX pass.

---

## Role model

**Two independent dimensions.** A user's web authority and their roster membership in a club are **separate**.

### Global roles (column: `profiles.role`)
- `student` — default for any new account.
- `super_admin` — system-wide bypass of RLS. Currently held by Gladiator only.
- `admin` — legacy enum value, unused. Retained because the enum still has it; intentionally not granted to anyone.

### Per-club tiers (column: `club_admins.admin_role`)
- `lead` — Overall Coordinator IRL, full control + manages other admins.
- `manager` — Head Coordinator, content + events + applications + gallery.
- `editor` — Coordinator, content only (no applications, no members).

A user is a club admin if-and-only-if they have a row in `club_admins`. The admin link in the navbar shows when `isClubAdmin || super_admin`.

### Roster (column: `club_members`)
Independent of admin tiers. A lead can exist without being a member. A member can exist without being an admin. **The two never auto-link.** Membership materializes only when a recruitment is published with their accepted application; removal flips the application status to `removed`.

### Real-world position naming
The web tiers (lead/manager/editor) correspond to real NITRR positions (Overall Coordinator / Head Coordinator / Coordinator / Volunteer for regular members). Position names will be surfaced via `club_team` on the public page in a future step. They're **distinct** from web tiers — admin tier controls *what you can do in the system*; member role controls *how you're displayed on the public site*.

### Test accounts
| Account | Email | Setup |
|---|---|---|
| Gladiator | `examplemail@gmail.com` (Test1234!) | super_admin + lead of Shaurya |
| Sumanth | `sumanth@nitrr.ac.in` | student + 2nd lead of Shaurya |
| Maximus | `maximus@nitrr.ac.in` | student + manager of Shaurya |
| Spartan | `spartan@nitrr.ac.in` | student + editor of Shaurya |
| Recruit | `recruit@nitrr.ac.in` (Test1234!) | pure student for apply-flow tests; CSE23010, year 2, CSE |

---

## Database schema (current)

```
profiles (id PK, email, full_name, role enum [student|admin|super_admin],
          roll_number, year, branch, gender, created_at)

categories (id PK, slug, name, sort_order)

clubs (id PK, slug unique, name, tagline, description,
       category_id FK, highlights text[], is_recruiting bool,
       member_count int, instagram_url, linkedin_url,
       community_whatsapp_link text,        -- revealed to members at publish (step 11)
       updated_by FK, created_at, updated_at)

club_admins (club_id FK, profile_id FK, admin_role enum [lead|manager|editor],
             primary key (club_id, profile_id))

club_members (club_id FK, profile_id FK, joined_at,
              primary key (club_id, profile_id))

club_team (id PK, club_id FK, name, position, photo_url, sort_order)
  -- display-only; for public page coordinator listing

recruitments (id PK, club_id FK, name,
              deadline timestamptz, result_date timestamptz,
              results_published_at, results_published_by FK,
              interview_whatsapp_link text,   -- revealed at deadline (step 11)
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

gallery_photos (id PK, club_id FK, image_url, caption, sort_order, created_at)

faqs (id PK, question, answer, is_published, sort_order)
```

### Key SQL functions
- `recruitment_phase(uuid) → 'open' | 'review' | 'result'`
  - `result` if `results_published_at IS NOT NULL`
  - `open` if deadline null OR now < deadline
  - `review` otherwise
- `current_recruitment_for_club(club_id_in uuid) → uuid` — returns the most recent recruitment's id
- `enforce_application_phase()` trigger — gates writes by phase. Honors `app.bypass_phase_check = 'true'` GUC for legitimate admin operations
- `publish_recruitment_results(uuid)` — lead-only, gated on zero pending/reviewing, atomically materializes accepted apps into `club_members`
- `start_new_recruitment(club_id, name, deadline, result_date, interview_whatsapp_link, interview_mode)` — lead/manager, gates on previous recruitment being in result phase
- `remove_member(club_id, profile_id)` — SECURITY DEFINER, lead-only (super_admin override), atomic delete from `club_members` + flip application to `removed`. Uses the GUC bypass to satisfy the phase trigger.
- Auth helpers: `is_super_admin()`, `can_edit_club_content(uuid)`, `can_manage_applications(uuid)`, `can_manage_admins(uuid)`, `club_tier(uuid)`, `is_club_admin(uuid)`

---

## Recruitment lifecycle (the core model)

A `recruitments` row owns its own lifecycle. The clubs row is permanent metadata.

```
  ┌──────────┐   deadline    ┌────────────┐   publish    ┌──────────┐
  │   OPEN   │ ────────────▶ │   REVIEW   │ ───────────▶ │  RESULT  │
  └──────────┘   passes      └────────────┘  (lead-only) └──────────┘
   • student CRUD              • admin decides            • locked
   • no decisions              • student locked           • members materialized
                               • interview WhatsApp        from accepteds
                                 reveals (step 11)
```

- **Open phase:** student can apply, edit, withdraw. Admin reads + notes only.
- **Review phase:** student locked. Admin accepts/rejects. Lead-only "publish" gated on zero remaining `pending|reviewing`.
- **Result phase:** locked. Accepted applications materialize as `club_members` rows via the publish RPC.

### Multi-cycle support
Each "Start new recruitment" inserts a new `recruitments` row. The old row stays as history. Applications point to the recruitment they were submitted into. Students can re-apply in *future* recruitments (different row), not in the same one (unique constraint blocks).

### Application status semantics
- `pending` — submitted, undecided
- `reviewing` — admin has glanced/started reviewing (organizing label only)
- `accepted` / `rejected` — admin decision (visible to student only after publish)
- `withdrawn` — student withdrew during open phase
- `removed` — was accepted/member, then removed via `remove_member`

### Status visibility to student
During review phase, the student sees "Under review" *regardless* of the admin's decision. The actual accept/reject only appears post-publish. Enforced in `application-row.tsx` via the `displayStatus` function — the data is correct, the UI masks it.

---

## Recruitment workflow (the operational model)

How recruitment actually plays out, mapping system features to real-world steps:

1. **Open phase (apply window).** Lead/manager opens a recruitment (creates `recruitments` row with deadline, result_date, interview mode, interview WhatsApp link). Students apply. The interview WhatsApp link is stored but NOT shown yet.
2. **Deadline passes → review phase.** Students locked out. Interview WhatsApp link revealed to applicants on their `/profile` (step 11 surfaces this). Admins coordinate interviews off-system via that group.
3. **Review phase (decisions).** Admin marks applications accepted/rejected. Status changes visible to admin but masked from student.
4. **Finalize.** Lead reviews — all applications must be decided (zero pending/reviewing remaining).
5. **Publish.** Lead clicks publish. Atomic: recruitment marked published, accepted applications become `club_members` rows. Community WhatsApp link revealed on the accepted students' `/profile` (step 11).

Why this workflow: it mirrors what NITRR clubs already do (Google Forms → Excel → WhatsApp coordination → manual shortlist → another WhatsApp group). The system replaces the scattered tools with one place, but doesn't force a new operating model.

### What's NOT in scope
- **Waitlisted** — covered by `reviewing` status; no separate state.
- **In-app interview scheduling** — happens off-system in WhatsApp. The system just reveals the right link at the right phase.
- **Cross-cycle analytics** — deferred to a later step if needed.
- **Carryover applications across cycles** — students re-submit fresh in each recruitment.

---

## Routes & rendering strategy

| Group | Routes | Strategy |
|---|---|---|
| `(marketing)` | `/`, `/clubs`, `/clubs/[slug]`, `/events`, `/events/[slug]`, `/gallery`, `/about`, `/faq`, `/contact` | ISR for home/clubs/events; SSG for about/faq |
| `(marketing)` | `/clubs/[slug]/apply` | SSR with auth gate |
| `(auth)` | Sign-in modal + `/auth/callback` | client |
| `(student)` | `/profile` | SSR with auth gate |
| `(admin)` | `/admin`, `/admin/clubs/[slug]`, `/admin/clubs/[slug]/events`, `/admin/clubs/[slug]/applications`, `/admin/clubs/[slug]/members`, `/admin/clubs/[slug]/gallery` | SSR with auth + tier gate |

CSR islands inside SSR pages: filter pills, edit forms, modals, drag-and-drop, dashboards.

**Auth gate pattern:** route group's `layout.tsx` does session check → calls a query that hits RLS as a second gate. Two layers cover each other (UI shouldn't be the only enforcement).

---

## What's done and what's left

### Done (steps 1-9f)
- **1-4:** Scaffold, Supabase schema/RLS/seed/clients, design system + nav + footer, full landing page (10 sections wired to Supabase)
- **5:** Public clubs listing + detail pages
- **6:** Auth (Google OAuth code path; console setup pending)
- **7:** Public events pages
- **8:** Gallery placeholder page (static; upload comes in 9e)
- **9a:** Student profile + applications list
- **9b:** Admin shell + edit-club content + club_admins-based authority
- **9c:** Admin events CRUD + floating glass sidebar pill + unsaved-changes guard
- **9d:** Admin applications review
- **9d-fixes:** Three-phase model (open/review/result), publish RPC, status masking, membership-at-publish-only
- **9f-1:** Recruitments table migration; data + queries + actions threaded through; phase functions renamed
- **9f-2:** Start new recruitment + Remove member UI; community WhatsApp link field; GUC trigger bypass
- **9f-3:** Active vs History split on /profile (collapsed by default); Current/History tabs on admin applications page (history grouped by recruitment)

### Left
| Step | Description |
|---|---|
| **9e** | Gallery upload (Supabase Storage bucket + upload action + admin gallery page) |
| **10** | Email notifications on accept/reject/publish (SendGrid or Resend) |
| **11** | Year-restricted positions + per-position custom questions + interview WhatsApp reveal + community WhatsApp reveal on profile |
| **12** | Sysadmin panel + club admin assignment UI (replaces manual `insert into club_admins` SQL) |
| **13** | Deploy (Vercel + GH Actions CI) |
| **UI/UX pass** | Mobile redesigns, restore club-card style on My clubs (currently inline plain list), real photos, font polish, accent color decision, custom badges (distinct super_admin tag) |

---

## Step 11 — design locked

When we get there, the workflow is **per-position with year eligibility** (option B from our decision):

- One `recruitment` has multiple **positions** (new table `recruitment_positions`)
- Each position has `eligibility_min_year`, `eligibility_max_year`, `title`, `openings_count`
- Each position has its own **custom question set** (`position_questions` table — prompt, order, required). Default 3 questions, lead can add/remove freely.
- Student sees only **eligible positions** on the club page (filter by their year)
- Application points to a position via new column `applications.position_id` (nullable until step 11 lands, then enforced after backfill)
- Admin review groups applications by position
- Interview WhatsApp link is revealed on student `/profile` once the recruitment enters review phase (only to applicants of that recruitment)
- Community WhatsApp link revealed on `/profile` to accepted members only, post-publish

Schema for step 11:
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
  -- nullable; in step 11 we'll backfill existing apps to an implicit
  -- "Volunteer" position per recruitment, then make NOT NULL
```

---

## Step 12 — admin management UI (planned)

Replaces all current SQL maintenance for club admins.

- New page `/admin/clubs/[slug]/admins` — lead/super_admin only
- List current admins with tier, change tier, remove
- "Add admin" — search profiles by name/email/roll, pick tier, confirm
- Last-lead trigger already exists; UI surfaces the "can't remove only lead" message
- New sysadmin section visible to super_admin: create club, decommission club, promote/demote super_admin, system-wide views

---

## Working approach & lessons baked in

### Build cadence
- Incremental, step-ordered build. Each step ships a `SETUP_STEP*.md` file map + run instructions + smoke test path.
- Only re-output files that actually change. The user copies them to the project.
- Terse explanations preferred — code + run instructions, minimal prose.
- Complex reconciliation tasks (migration aftermath, catching cascading gaps) handed off to Claude Code in VS Code with a written handoff doc.

### Lessons baked in (revisit before relevant work)

1. **RLS is a safety net, not a query filter.** Always add explicit `.eq("profile_id", user.id)` / `.eq("club_id", clubId)` / `.eq("recruitment_id", recId)` in queries. RLS policies use OR semantics — a "student reads own" policy plus an "admin reads club" policy fires both for super-admins, leaking other people's data when the query doesn't scope. *(From the 9a applications-leak bug.)*

2. **GRANTs and RLS are two separate layers.** Every new table or new write privilege needs a base-table GRANT to `authenticated` AND an RLS policy. Forgetting GRANT yields "permission denied" even with passing RLS. *(From the 9b club-edit bug.)*

3. **Trigger/constraint/function names must be verified against `information_schema` before writing drops.** Never assume the name matches what was written in your migration SQL — a lurking `enforce_application_deadline` with a mismatched name caused a hard-to-trace bug in 9f-1. Always: `select trigger_name from information_schema.triggers where event_object_table = 'tablename'` and compare. *(From the 9f-1 trigger error.)*

4. **Migrations need to disable downstream triggers during data moves.** If a trigger reads columns you're about to drop, the trigger will fire during the migration's data updates and fail. Wrap data-mutation in `alter table X disable trigger T` / `enable trigger T`. *(From the original 9f-1 migration crash.)*

5. **When rewriting files after a migration, preserve existing export surfaces.** Surgical internal edits where columns moved, NOT full rewrites from scratch. Breaking this twice in 9f-1 (dropped `getCategories`, `getAllClubSlugs`, the 5 home queries) caused cascading "module has no export X" errors. Audit consumers via grep before rewriting. *(From the 9f-1 aftermath.)*

6. **`cookies()` cannot be used inside `generateStaticParams`** (Next 16 strict enforcement). Use `lib/supabase/static.ts` → `createStaticClient()` for cookies-free queries from build context.

7. **Nested `<form>` elements cause hydration errors.** Any modal containing a form must render OUTSIDE any parent form in the DOM tree. Surgical fix: move the modal-trigger above/outside the parent form. Long-term: wrap modals in a React Portal. *(From the 9f-2 club-edit form bug.)*

8. **The navbar's auth check must use the right authority source.** Checking a role enum instead of `club_admins` membership caused admin links to silently disappear for club admins in 9b. Always remember: authority lives in `club_admins`, not in `profiles.role`. *(From the 9b navbar dropdown bug.)*

9. **The three-phase recruitment model prevents stale membership state.** Don't materialize membership at accept-click — only at publish. This avoids the "student withdraws their accepted-but-not-published app and breaks re-apply" class of bug. *(From the 9d revert-from-accepted bug.)*

10. **Multi-account testing requires separate incognito windows.** Supabase auth lives in HttpOnly cookies, not localStorage. Clearing localStorage doesn't sign you out. *(From a half-day session-leak misinvestigation that turned out to be a real RLS leak.)*

11. **Custom Postgres GUCs (with a dot prefix) don't need superuser privilege.** Use `set_config('app.bypass_phase_check', 'true', true)` for function-level signals to triggers. This replaces the `session_replication_role = replica` approach which would have needed superuser. *(From the 9f-2 remove_member trigger conflict.)*

### File-shipping conventions
- Files named with `__` as path separator when flat (e.g. `marketing__page.tsx` = `app/(marketing)/page.tsx`)
- Reserved Next names must stay exact: `page.tsx`, `layout.tsx`, `route.tsx`, `proxy.ts`
- Helper/component files preserve real paths: `ui__pill.tsx` → `components/ui/pill.tsx`
- Setup file is always called `SETUP_STEP<N>.md`

### Dev/maintenance recipe
- Clear `.next` after schema migrations (Turbopack caches aggressively)
- Run `tsc --noEmit` after batch file drops
- Run `grep -rn "<dropped column>" lib/ components/ app/ --include="*.ts" --include="*.tsx"` after dropping any column to find lingering references
- When a query file is rewritten, run `grep "^export" lib/queries/<file>.ts` to see its current export surface; compare against `import` statements in consumers

### Manual SQL maintenance reference
For emergencies (UI not yet available), here are the patterns:

```sql
-- Force-clear a publish stamp (workaround if start-new-recruitment isn't fitting)
update recruitments
set results_published_at = null, results_published_by = null
where id = current_recruitment_for_club(
  (select id from clubs where slug = 'shaurya')
);

-- Manually flip an application status (bypass trigger via GUC)
select set_config('app.bypass_phase_check', 'true', false);
update applications set status = 'removed' where id = '<uuid>';

-- Check current recruitment for a club by slug (avoid bare UUIDs)
select r.* from recruitments r
join clubs c on c.id = r.club_id
where c.slug = 'shaurya'
order by r.created_at desc;

-- Find all triggers on a table (before writing any drops!)
select trigger_name, action_statement
from information_schema.triggers
where event_object_table = 'applications';
```

---

## Smoke test reference (post-9f)

End-to-end recruitment cycle test (catches most regressions in ~5 min):

1. **As Gladiator (super_admin + lead of Shaurya):**
   - `/admin/clubs/shaurya` → if previous recruitment is published, "Start new recruitment" button visible. Click → fill modal → submit → page reloads with new recruitment.
   - Set deadline ~2 min future, result_date ~5 min future. Save.
2. **As Recruit (incognito window 2):**
   - `/clubs/shaurya` → Apply button enabled.
   - Submit application → `/profile` shows the application under Active with "Pending" status.
3. **Wait for deadline to pass.** Refresh both windows.
4. **As Recruit:** application now shows "Under review" status. View modal says "can't be edited."
5. **As Gladiator:** `/admin/clubs/shaurya/applications` → phase banner says "Review phase". Accept Recruit's application.
6. **As Recruit:** refresh `/profile` → still "Under review" (status masked until publish). "My clubs" empty.
7. **As Gladiator:** publish panel shows "Ready to publish." Click → confirm → publish.
8. **As Recruit:** refresh `/profile` → application now shows "Accepted" (and is in History since the recruitment is now published). Shaurya appears in "My clubs."
9. **As Gladiator:** `/admin/clubs/shaurya/members` → Recruit is in the roster. Click Remove → confirm.
10. **As Recruit:** refresh `/profile` → Shaurya gone from "My clubs". Old application shows "Removed" status in History.
11. **As Recruit:** try to apply to Shaurya's current open recruitment → if you started a new one in step 1, it works (new application row, new recruitment). If you didn't, blocked correctly.

---

## Open small flags (not blocking, deferred)

- Switch club popover positioning works via `fixed` + `getBoundingClientRect`; may have edge cases on resize/scroll
- Super_admin shows generic "Lead" tag on clubs they don't formally admin — should show distinct "Super_admin" badge (cosmetic, UI/UX pass)
- `useUser` hook can briefly flip to "not logged in" on transient network errors → sign-in modal pops up; should preserve previous state on transient errors (defer to polish pass)
- My clubs section currently renders as a plain inline list; previous club-card aesthetic to be restored in UI/UX pass
- Mobile-specific section redesigns deferred
- Real photos, font polishing deferred
- Google OAuth console setup pending (code path done since step 6)