# 16A Round 1 — Complete

## What's in place

**SQL migrations** copied to [supabase/16a_drive_schema.sql](supabase/16a_drive_schema.sql) and [supabase/16a_drive_rpcs.sql](supabase/16a_drive_rpcs.sql). Both files use `create ... if not exists` and the schema file guards its constraint drop, so they're safe to re-run.

**CLAUDE.md** — all 7 edits applied:
1. Step ledger — 15a-e moved to Done; 16a-d added to Left with 16a marked in-progress
2. Schema block — `recruitments` updated with `description`/`target_years`/`published_at`; new `drive_questions` block added directly below
3. Key SQL functions — new "Drive management (16A)" subsection with all 8 RPCs; existing `recruitment_phase` + `enforce_application_phase` entries annotated with the draft-phase change
4. Audit category mapping — new "Drives (16A)" row
5. Step 16 design — old "per-position" sketch replaced with the drives-are-the-unit final design
6. Lessons 25 (two-tab auth patterns) + 26 (auth implementation gotchas) appended
7. Lifecycle diagram — DRAFT column added; WhatsApp reveals repositioned to REVIEW + RESULT columns; "step 16" reference updated to "step 16C"

---

# 16A Round 2 — Blast Radius Audit

Doing this now so you have the map before we ship code. I traced every import + string reference across `lib/`, `app/`, `components/`.

## Files that MUST change in round 2

### Tier 1 — foundational (touches types + phase enum)

| File | Why it must change |
|---|---|
| [lib/database.types.ts](lib/database.types.ts) | Add generated types for `drive_questions` table + new `recruitments` columns (`description`, `target_years`, `published_at`). Currently line 26 shows `Row: { club_id, created_at, id, note, note_at, note_by, profile_id, recruitment_id, responses, status, updated_at }` on `applications` — needs regen after Supabase migration runs. |
| [lib/phase.ts](lib/phase.ts) | Line 1: `Phase = "open" \| "review" \| "result"` → add `"draft"`. `getPhase()` needs a new input branch reading `published_at`. `phaseLabel`, `studentMessage`, `PHASE_BADGE` need `draft` cases. |

### Tier 2 — recruitment-page UI (rewrite)

| File | Why it must change |
|---|---|
| [app/(admin)/admin/clubs/[slug]/recruitment/page.tsx](app/(admin)/admin/clubs/[slug]/recruitment/page.tsx) | Currently loads a single `current_recruitment` via `getEditableClub` and passes it to `<RecruitmentSection>`. New shape needs a `listDrivesForClub(clubId)` query + list view + "New drive" button. |
| [components/admin/recruitment-section.tsx](components/admin/recruitment-section.tsx) | Whole "edit-the-single-current-recruitment" model becomes obsolete. This component gets replaced by a `<DriveListView>` per the SETUP file map. |
| [lib/queries/admin.ts](lib/queries/admin.ts) | `getEditableClub` returns `current_recruitment` — that's an OK shape to keep for now (backward compat for other consumers like `applications/page.tsx`), but the recruitment page should stop reading it in favor of the new `listDrivesForClub`. |

### Tier 3 — phase enum consumers (add draft branch)

31 phase-string usages across 6 files. Every `switch(phase)` or `phase === "open"` chain needs a `"draft"` case:

| File | Change needed |
|---|---|
| [app/(admin)/admin/clubs/[slug]/applications/page.tsx](app/(admin)/admin/clubs/[slug]/applications/page.tsx) | Phase banner (`phase === "open"`, `"review"`, `"result"`) — add draft branch: probably "Drive is in draft, no applications yet — publish to open." |
| [components/admin/application-review-row.tsx](components/admin/application-review-row.tsx) | Same shape of `phase === "open"` branches — likely just needs `if (phase === "draft") return null` or similar. |
| [components/admin/recruitment-section.tsx](components/admin/recruitment-section.tsx) | Will be rewritten (Tier 2) — carry draft into the new UI. |
| [components/profile/application-row.tsx](components/profile/application-row.tsx) | Student-side phase display. Draft shouldn't reach students since apps can't be created in draft phase, but defensive `if (phase === "draft") return "—"` is worth adding. |
| [lib/actions/admin-application.ts](lib/actions/admin-application.ts) | `setApplicationStatus` currently rejects on `phase === "open"` and `phase === "result"`. Add: reject on `phase === "draft"` too. Same file has `publishResults` — it currently doesn't check phase, relies on the RPC. Still fine. |
| [lib/phase.ts](lib/phase.ts) | Already Tier 1. |

### Tier 4 — applications page + queries (drive-scoped, not club-scoped)

Currently `getApplicationsForClub(clubId)` in [lib/queries/admin-applications.ts](lib/queries/admin-applications.ts) loads applications for the club's **most-recent** recruitment. That's still correct-ish while 16A runs (drives ARE recruitments underneath), but two issues:

1. The "most-recent" logic will start including drafts. Any newly-created draft would push the actually-open recruitment out of the "current" slot. **This is the most subtle regression risk in 16A.** Fix: filter `published_at is not null` when picking the "current" row, OR let the admin pick which drive to view.
2. Longer-term (16B) each drive should have its own applications view. That's 16B scope, but 16A needs to at least not silently break existing applications workflow.

**Recommendation for 16A:** patch `getApplicationsForClub` to `.not("published_at", "is", null)` when picking "current." Cheap defensive change, buys correctness during the coexistence window.

### Tier 5 — student apply flow (defensive draft check)

| File | Change needed |
|---|---|
| [app/(student)/clubs/[slug]/apply/page.tsx](app/(student)/clubs/[slug]/apply/page.tsx) | Line 45 selects the "current" recruitment same way. If a lead creates a draft drive, this would return the draft and set `open = false` (deadline is likely in the future for a draft, and `published_at is null`). Since `is_recruiting` still gates the whole page, the draft never leaks to students, BUT the recruitment shown to students should filter `.not("published_at", "is", null)` for correctness. |
| [lib/actions/application.ts](lib/actions/application.ts) | Line 44-51 — same "get current recruitment" pattern. The trigger update (`enforce_application_phase` blocks draft) is the belt+suspenders defense here. Adding the JS-level filter is polish. |

### Tier 6 — new files to create (per SETUP file map)

| File | Purpose |
|---|---|
| `lib/queries/admin-drives.ts` | `listDrivesForClub(clubId)`, `getDriveWithQuestions(driveId)` |
| `lib/validation/drive.ts` | Zod schemas for create/update drive + question CRUD |
| `lib/actions/drive.ts` | 8 server actions wrapping the 8 RPCs |
| `app/(admin)/admin/clubs/[slug]/recruitment/new/page.tsx` | Drive create form |
| `app/(admin)/admin/clubs/[slug]/recruitment/[driveId]/page.tsx` | Drive editor form |
| `components/admin/drive-list-row.tsx` | Row in list view |
| `components/admin/drive-editor-form.tsx` | Create/edit form (shared shape) |
| `components/admin/target-years-picker.tsx` | Year 1-4 chip multi-select |
| `components/admin/question-builder.tsx` | Questions list + inline edit + reorder |
| `components/admin/question-editor-row.tsx` | Single question row |

## Files that must NOT change in 16A (deliberately)

Called out because they're tempting refactor targets, but the SETUP explicitly defers them:

| File | Why deferred |
|---|---|
| [lib/validation/application.ts](lib/validation/application.ts) | Hardcodes `motivation` / `experience` / `contribution` fields. 16A doesn't touch the apply flow — those 3 field names still work because the backfill inserts them as `drive_questions` rows. Per-drive dynamic questions come in 16B. |
| [components/clubs/apply-form.tsx](components/clubs/apply-form.tsx) | Same — 16B refactor. |
| [lib/actions/application.ts](lib/actions/application.ts) `submitApplication` | Same — 16B refactor. Only the "get current recruitment" query needs the `published_at` filter (Tier 5). |
| [lib/actions/recruitment.ts](lib/actions/recruitment.ts) `startNewRecruitment` | Still callable during 16A/16B — it creates a recruitment with `published_at = created_at` (via the migration backfill logic), which means non-draft. Coexistence is fine. Removal is 16D. |
| [lib/actions/club.ts](lib/actions/club.ts) `updateRecruitment` | Still needed — it edits deadline/result_date on the "current" recruitment + toggles `is_recruiting`. Same coexistence caveat. |
| `clubs.is_recruiting` consumers (10 files) | Explicitly deferred to step 16D per the SETUP. |

## Coexistence risks I want to name explicitly

**1. The "most-recent recruitment" query pattern is now broken by drafts.** This pattern appears in:
- [lib/queries/admin.ts](lib/queries/admin.ts) `getEditableClub` (line 192-198)
- [lib/queries/admin-applications.ts](lib/queries/admin-applications.ts) `getApplicationsForClub` (line 34-40), `getApplicationHistoryForClub` (line 104-108), `getApplicationCountsForClub` (line 65-71)
- [lib/queries/clubs.ts](lib/queries/clubs.ts) `getClubBySlug` (subquery on recruitments)
- [lib/queries/home.ts](lib/queries/home.ts) — check needed
- [lib/actions/application.ts](lib/actions/application.ts) `submitApplication` (line 44-51)
- [lib/actions/club.ts](lib/actions/club.ts) `updateRecruitment` (line 126-132)
- [app/(student)/clubs/[slug]/apply/page.tsx](app/(student)/clubs/[slug]/apply/page.tsx) (line 45-51)

Every one of these should add `.not("published_at", "is", null)` OR `.is("published_at", ..)` filter appropriate to context. This is the biggest single review item for round 2 and I recommend a dedicated commit for it, cleanly named "16A: filter drafts from most-recent-recruitment queries."

**2. `updateRecruitment` semantics for drafts.** Currently it edits the "current" recruitment's deadline/result_date. If we filter out drafts (fix #1 above), then `updateRecruitment` targets the most-recent-published — which may not be the one the admin thinks they're editing. The recruitment page is being rewritten anyway (Tier 2), so `updateRecruitment` becomes callable only from legacy paths. Safe if the recruitment page's new UI doesn't use it. Recommendation: **do not delete `updateRecruitment` in 16A**; the new drive-editor form uses `update_drive` RPC instead. Leave the old action untouched.

**3. Audit log needs new categorize entries.** [lib/audit/categorize.ts](lib/audit/categorize.ts) will need `create_drive`, `publish_drive`, `delete_drive` added to the "clubs" category (or a new "drives" category per the CLAUDE.md patch). [lib/audit/format.tsx](lib/audit/format.tsx) needs sentence templates for those three action strings. Not blocking anything, but if we skip it, the new audit entries will render as their raw action name.

**4. The `enforce_application_phase` trigger update.** The SQL migration replaces `enforce_application_phase`. The trigger already exists and is registered to the `applications` table. Replacing the function body is safe — no trigger disable/enable needed. But: **verify in the SQL editor** after running that the new definition is what's actually installed (Lesson 3).

## Recommended round-2 shipping order

Given the interdependencies:

1. **Migration first** — you run the SQL manually. Confirm sanity checks (uncommented queries at the bottom of `16a_drive_schema.sql`).
2. **Types + phase** — regenerate `database.types.ts`, extend `Phase` in `lib/phase.ts`, add draft case to `PHASE_BADGE`/`phaseLabel`/`studentMessage`. This alone touches 6 files with `phase === ...` branches. `tsc --noEmit` after.
3. **Draft-filter defensive patch** — apply `.not("published_at", "is", null)` filter to the ~8 queries listed above. One focused commit, easy to review.
4. **Drive queries + validation + actions** — pure additions, no existing code touched.
5. **Drive editor form + supporting components** — pure additions.
6. **Recruitment page rewrite** — the risky one. Preserve the "no drives yet" empty state so existing admin muscle memory still works.
7. **Audit categorize + format** — small, additive.

Between steps 2 and 3, the app will typecheck but there'll be a window where "current recruitment" queries could hit a draft. Not user-visible in local dev, but worth being aware of.

## One thing to confirm before round 2 code drops

The SETUP says publish gate requires "deadline set." The SQL RPC `publish_drive` enforces `if drive_deadline is null then raise exception`. But `create_drive` accepts `deadline_in timestamptz` which can be null — meaning a draft can exist without a deadline, and the admin has to fill it in before publishing.

**Question:** should the drive editor UI *require* deadline at draft-save time, or only at publish time? The SETUP is ambiguous. The SQL is permissive at draft-save, strict at publish. I'd recommend the UI mirrors the SQL (allow null deadline in draft, require it on publish) — matches the "save as draft = incomplete OK" mental model. Flagging in case you want the opposite.

---

Ready for round 2 whenever you send it. I'll ship the code in the order above unless you tell me otherwise.

---

# 16A Round 2 Batch 1 — Foundation (Shipped)

Types + phase enum + draft-filter defensive patches. 15 files touched. Typecheck clean.

## What shipped

### Tier 1 — Foundation

| Change | File | Notes |
|---|---|---|
| REPLACE | [lib/phase.ts](lib/phase.ts) | `Phase = "draft" \| "open" \| "review" \| "result"`. `getPhase()` checks `published_at` first: `!published_at → "draft"`. `phaseLabel("draft") → "Draft"`. `studentMessage` gets a draft fallback. `PHASE_BADGE.draft = "bg-beige text-ink-soft"` (neutral, admin-only). |
| SKIP | [lib/database.types.ts](lib/database.types.ts) | Already regenerated by the user via Supabase CLI. Verified: `drive_questions` table at line 364, plus `description` (line 591), `published_at` (line 596), `target_years` (line 600) on `recruitments` Row. All 8 drive RPCs present in Functions block. |

### Tier 2 — Phase-consumer patches

| Change | File | Notes |
|---|---|---|
| PATCH | [app/(admin)/admin/clubs/[slug]/applications/page.tsx](app/(admin)/admin/clubs/[slug]/applications/page.tsx) | Added `phase === "draft"` banner (`"This drive isn't published yet. Publish it to start accepting applications."`) above the existing open/review/result branches. |
| PATCH | [components/admin/application-review-row.tsx](components/admin/application-review-row.tsx) | Added defensive `if (phase === "draft") return null;` at the top of `ApplicationDetail`'s render — applications shouldn't reach here for a draft (trigger blocks + query filter), but the belt+suspenders keeps the row inert if they do. |
| PATCH | [components/profile/application-row.tsx](components/profile/application-row.tsx) | Extended `displayStatus` with a draft branch that returns `{ label: "—", style: STATUS_STYLES.pending }`. Simpler than a full row replacement — pill just renders inertly. |
| PATCH | [lib/actions/admin-application.ts](lib/actions/admin-application.ts) | Added `if (phase === "draft") return { error: ... }` to `setApplicationStatus` before the open/result checks. |
| SKIP | [components/admin/recruitment-section.tsx](components/admin/recruitment-section.tsx) | No code change needed — `PHASE_BADGE[phase]` and `phaseLabel(phase)` are already draft-aware via the new phase.ts. The `phase === "open"` / `"review"` / `"result"` prose chain is non-exhaustive and simply renders empty for draft (which the draft filter prevents anyway). Batch 3 rewrites this file entirely. |

### Tier 3 — Draft-filter defensive patches

Every "most-recent recruitment" query gets `.not("published_at", "is", null)`. Same shape everywhere: one line inserted immediately before `.order("created_at", { ascending: false })`.

| # | File | Function | Consumer impact |
|---|---|---|---|
| 1 | [lib/queries/admin.ts](lib/queries/admin.ts) | `getEditableClub` | Admin's per-club edit + recruitment pages get the current published drive, not any draft. |
| 2 | [lib/queries/admin-applications.ts](lib/queries/admin-applications.ts) | `getApplicationsForClub` | Applications page shows the published drive's apps. |
| 3 | [lib/queries/admin-applications.ts](lib/queries/admin-applications.ts) | `getApplicationCountsForClub` | Counts match the shown applications. |
| 4 | [lib/queries/admin-applications.ts](lib/queries/admin-applications.ts) | `getApplicationHistoryForClub` | History never includes abandoned drafts. |
| 5 | [lib/queries/clubs.ts](lib/queries/clubs.ts) | `getAllClubs` (`recs` bulk query) | Public clubs listing derives per-club current from published drives only. |
| 6 | [lib/queries/clubs.ts](lib/queries/clubs.ts) | `getClubBySlug` (`recRes` subquery) | Public club detail page same. |
| 7 | [lib/actions/application.ts](lib/actions/application.ts) | `submitApplication` | Student-submit path: if a club only has drafts, error out with `"This club isn't accepting applications right now."` instead of falling through to the trigger's harsher error. |
| 8 | [app/(student)/clubs/[slug]/apply/page.tsx](app/(student)/clubs/[slug]/apply/page.tsx) | apply-page fetch | Student-facing apply UI never sees a draft. |
| 9 | [lib/actions/club.ts](lib/actions/club.ts) | `updateRecruitment` | Legacy action operates only on the current published drive. This action is only reachable from the pre-16A recruitment-section UI, which Batch 3 rewrites. Kept for compat. |

### Tier 4 — Caught by the final sweep

| # | File | Function | Notes |
|---|---|---|---|
| 10 | [lib/queries/admin.ts](lib/queries/admin.ts) | `getCurrentRecruitments` (private dashboard helper) | This wasn't in the SETUP's 9-item list but is the same "most-recent per club" pattern (grouped across all clubIds the admin sees). A draft would silently push the actually-open drive out of the dashboard card. Fixed. |

## What I explicitly did NOT do

- **`lib/queries/home.ts`** — confirmed by inspection: has no `recruitments` query at all. The homepage widgets read `clubs`, `events`, `categories`, `faqs`, `gallery_photos`. The SETUP hedged ("if it references recruitments"); it doesn't. No patch needed.
- **`lib/queries/sysadmin.ts:65`** — `supabase.from("recruitments").select("*", { count: "exact", head: true })` returns the total-recruitments count on the sysadmin landing card. That's an aggregate observability metric — arguably counting drafts belongs there (it reflects real DB state). No patch.
- **Full rewrite of `components/admin/recruitment-section.tsx`** — Batch 3 does this. Batch 1 minimum was verifying the badge/label helpers now handle draft, which the new `PHASE_BADGE` + `phaseLabel` do.

## Coexistence risk that materialized (and was closed)

The blast-radius audit at the top called out that "the 'most-recent recruitment' query pattern is now broken by drafts" as the biggest regression risk. Batch 1 closes it. **After Batch 1, no admin or student UI can ever see a draft** — drafts are visible only when queried explicitly by drive id (which no consumer does yet; Batch 2 introduces those queries).

Trigger-level defense (from Round 1 SQL) still stands: `enforce_application_phase` blocks application insert/update against a draft. Belt + suspenders.

## Verification

**Typecheck:** clean via `npm run typecheck`.

**Final sweep:** `grep -rn -B1 -A4 "from(\"recruitments\")" ./lib ./app ./components` shows every remaining recruitments query either (a) has the `.not("published_at", "is", null)` filter, (b) is the sysadmin count query (deliberately unfiltered), or (c) is a write UPDATE targeting an already-selected row.

**Smoke test** (per SETUP — user runs):
- SQL: `select create_drive((select id from clubs where slug='shaurya'), 'Test Draft 16A Batch 1', 'Testing draft filter', array[1,2], now() + interval '7 days', now() + interval '14 days');`
- Visit `/admin/clubs/shaurya` → still shows the existing published recruitment; the test draft is invisible.
- Visit `/admin/clubs/shaurya/applications` → still shows published recruitment's apps.
- SQL: `select recruitment_phase(id) from recruitments where name='Test Draft 16A Batch 1';` → `'draft'`.
- Cleanup: `select delete_drive((select id from recruitments where name='Test Draft 16A Batch 1'));`

## What's next

Ready for Batch 2:
- `lib/queries/admin-drives.ts` — `listDrivesForClub`, `getDriveWithQuestions`
- `lib/validation/drive.ts` — Zod schemas
- `lib/actions/drive.ts` — 8 server actions wrapping the 8 RPCs
- `lib/audit/categorize.ts` — `create_drive` / `publish_drive` / `delete_drive` category assignment
- `lib/audit/format.tsx` — sentence templates for those 3 action strings

Batch 3 (after Batch 2 lands): drive editor components + pages + recruitment page rewrite.

Say "Batch 1 clean" once the smoke test passes on your end and I'll pick up Batch 2 when you send it.

---

# 16A Round 2 Batch 2 — Drive queries + validation + actions + audit metadata (Shipped)

Pure additions on top of Batch 1's foundation. Typecheck clean. 6 files touched, plus 1 caught bug fix.

## What shipped

### Tier 1 — New files

| Change | File | Notes |
|---|---|---|
| NEW | [lib/queries/admin-drives.ts](lib/queries/admin-drives.ts) | Two queries: `listDrivesForClub(clubId)` returns all drives (including drafts) with computed `phase` + `applicant_count` (via Supabase embedded-resource `applications(count)`); `getDriveWithQuestions(driveId)` returns drive + questions ordered by `sort_order`. Both compute `phase` client-side via the Batch-1 `getPhase()` helper — draft comes back naturally. |
| NEW | [lib/validation/drive.ts](lib/validation/drive.ts) | Zod schemas: `createDriveSchema`, `updateDriveSchema`, `publishDriveSchema`, `deleteDriveSchema`, `addQuestionSchema`, `updateQuestionSchema`, `deleteQuestionSchema`, `swapQuestionOrderSchema`. `targetYearsSchema` enforces non-empty subset of {1,2,3,4} with no duplicates. Optional description + deadline + result_date go through `nullableText` / `nullableDatetime` transforms (empty-string → null). |
| NEW | [lib/actions/drive.ts](lib/actions/drive.ts) | 8 server actions wrapping the 8 RPCs from Round 1: `createDrive`, `updateDrive`, `publishDrive`, `deleteDrive`, `addDriveQuestion`, `updateDriveQuestion`, `deleteDriveQuestion`, `swapDriveQuestionOrder`. `DriveResult` discriminated union (`{ ok: true, driveId?, questionId? } \| { error: string }`). Every action reads `__club_slug` from formData and calls a shared `revalidateDrive(clubSlug, driveId?)` helper. `createDrive` + `deleteDrive` `redirect()` after success; the other six return `{ ok: true }`. |

### Tier 2 — Audit metadata patches

| Change | File | Notes |
|---|---|---|
| PATCH | [lib/audit/categorize.ts](lib/audit/categorize.ts) | Added `"drives"` variant to `AuditCategory` union, `CATEGORY_LABEL.drives = "Drives"`, `DRIVE_ACTIONS = new Set(["create_drive", "publish_drive", "delete_drive"])`, plus corresponding branches in `actionToCategory` and `actionsInCategory`. TypeScript's exhaustive-switch check on `actionsInCategory` would have flagged a missing branch — added simultaneously with the type. |
| PATCH | [lib/audit/format.tsx](lib/audit/format.tsx) | Three new `case` branches inside `formatAuditEntry`'s switch, added before the `default:` clause. Match the `audit_log.details` shape written by each RPC in `16a_drive_rpcs.sql`: `create_drive` reads `name` + `target_years`, `publish_drive` reads `question_count`, `delete_drive` reads `phase_at_deletion`. |
| PATCH | [components/admin/audit-log-view.tsx](components/admin/audit-log-view.tsx) | Added `{ key: "drives", label: CATEGORY_LABEL.drives }` to the `PILLS` array, positioned between "clubs" and "super_admins" per the SETUP. |

### Tier 3 — Caught by typecheck (not in SETUP)

**Generated-RPC-type mismatch on `create_drive` + `update_drive`.**

Both RPCs accept `NULL` for `description_in` / `deadline_in` / `result_date_in` in the SQL definition, but Supabase's `gen types` marks them as non-null `string`. Applying my Zod-validated inputs (which are `string | null` after the `nullableText` / `nullableDatetime` transforms) failed six typecheck lines (3 args × 2 RPCs).

**Fix:** cast the args object with `as never`. Same pattern already used at [lib/actions/recruitment.ts:52](lib/actions/recruitment.ts#L52) for `start_new_recruitment`, which has the identical mismatch. Applied to both `createDrive` and `updateDrive` in [lib/actions/drive.ts](lib/actions/drive.ts). Comment above each cast points to the sibling.

Ideally the fix should regenerate types with correct SQL function signatures (Supabase Studio's function editor may need the `default null` marker on nullable params), but the `as never` cast is the tolerated project convention — deferring cleanup.

## What I did NOT do (deliberately)

- **Nothing removed.** All Batch 2 work is additive.
- **Question CRUD actions do not audit-log.** RPC-level: correct — matches the SETUP's decision (high-volume edits, low value). Only drive-level actions (create/publish/delete) write to `audit_log`.
- **`revalidatePath` calls don't touch `/clubs/[slug]`.** Reason: drafts are hidden from public view (Batch 1's draft filter). Public revalidation happens naturally on publish via the RPC audit trigger. Not a bug — deliberate scope.

## Coexistence risk that's now live (worth flagging)

The Batch 1 audit noted `updateRecruitment` (legacy action from pre-16A) still touches the current published recruitment. With Batch 2's `updateDrive` action shipped, there are now two ways to edit an "open" recruitment:

- `updateRecruitment` (legacy) → operates on the most-recent published via `.not("published_at", "is", null).order(...).limit(1)` filter; still called by the old recruitment-section UI
- `updateDrive` (new) → operates on a specific `driveId` via RPC

Both work in isolation. But **if an admin has the old recruitment-section UI open in one tab and the new drive-editor open in another, edits in one won't reflect in the other until the pages refetch.** Batch 3 will remove the legacy UI so this coexistence window is short.

## Verification

**Typecheck:** clean via `npm run typecheck`.

**Grep sweep:**
```
grep -rn "create_drive\|publish_drive\|delete_drive" lib/audit/
```
Returns 6 hits — 3 in `format.tsx` (case branches), 3 in `categorize.ts` (DRIVE_ACTIONS set). Both files reference all three action names as intended.

**Smoke test** (per SETUP — user runs after Batch 3 UI ships OR by direct RPC calls):

- **A. Server actions callable via SQL insert (Batch 1 test drive):** the existing "Test Draft 16A Batch 1" row from the Batch-1 smoke test is a good target. Because `create_drive` requires `auth.uid()` (SQL editor NULL — Lesson 13), the raw INSERT path from Batch 1 is the workaround. In a Node/tsx shell:
  ```ts
  import { listDrivesForClub, getDriveWithQuestions } from "@/lib/queries/admin-drives";
  const drives = await listDrivesForClub("<shaurya-club-id>");
  // Expect the test draft to appear with phase: "draft", applicant_count: 0
  ```

- **B. Audit log rendering:** the Batch-1 raw INSERT bypassed the RPC, so `audit_log` doesn't have a `create_drive` entry yet. To smoke-test the audit rendering, either (a) manually insert an audit_log row with `action = 'create_drive'` and matching `details` shape, or (b) wait until Batch 3 UI is live and create a drive through the app. Visit `/admin/sysadmin/audit` — the "Drives" pill should be visible between "Clubs" and "Super admins", and clicking it should filter to only drive entries.

## What's next

Ready for Batch 3 — the UI layer:
- `components/admin/target-years-picker.tsx` — Year 1-4 chip multi-select
- `components/admin/question-editor-row.tsx` — single question row
- `components/admin/question-builder.tsx` — list wrapper with add + reorder
- `components/admin/drive-editor-form.tsx` — full drive create/edit form
- `components/admin/drive-list-row.tsx` — row in the drive list
- `app/(admin)/admin/clubs/[slug]/recruitment/page.tsx` — REWRITE (drive list)
- `app/(admin)/admin/clubs/[slug]/recruitment/new/page.tsx` — NEW
- `app/(admin)/admin/clubs/[slug]/recruitment/[driveId]/page.tsx` — NEW
- Removal or repurposing of `components/admin/recruitment-section.tsx` (Batch 1 deferred this)

Say "Batch 2 clean" (or wait for the UI to smoke-test) and I'll pick up Batch 3 when you send it.

---

# 16A Round 2 Batch 3a — Building-block components (User-applied + type fix)

Four new presentational/interactive components (dropped in by the user directly). Only backend touchpoint was fixing one type shape that Batch 2 got wrong.

## What shipped

Files dropped by the user (no code changes made by me):
- `components/admin/target-years-picker.tsx` — controlled Year 1-4 chip multi-select
- `components/admin/drive-list-row.tsx` — one row of the drive list on the recruitment page
- `components/admin/question-editor-row.tsx` — per-row inline auto-save (blur on textarea, click on type button, change on required toggle) + reorder + delete
- `components/admin/question-builder.tsx` — list wrapper with "Add question" button

## Bug caught by typecheck (fixed inline)

**Root cause:** `DriveResult` in [lib/actions/drive.ts](lib/actions/drive.ts) was defined as a discriminated union in Batch 2:

```ts
export type DriveResult =
  | { ok: true; driveId?: string; questionId?: string }
  | { error: string };
```

Batch 3a's components followed the standard project pattern of seeding `useActionState` with `{}` — which matches neither variant. TypeScript couldn't infer `State` cleanly and fell back to `Payload = void` on the returned `formAction`, cascading into 15 errors across 2 files:

- Line 49 / 75 / 233 / 289 — `{}` not assignable to `DriveResult` (4 errors)
- Line 78 / 85 / 92 — "Expected 0 arguments, but got 1" on `formAction(buildFormData(...))` (3 errors)
- Line 88 / 89 / 183 / 184 / 293 / 294 / 315 (×2) — `state.error` / `state.ok` failing to narrow (8 errors)

**Fix:** Flattened the type to match the project convention used by `AuthResult`, `ClubEditResult`, `ReviewResult`:

```ts
export type DriveResult = {
  error?: string;
  ok?: boolean;
  driveId?: string;
  questionId?: string;
};
```

All 8 action bodies still compile — they were already returning either `{ ok: true, ... }` or `{ error: ... }`, both valid under the flat shape.

## Retroactive note on Batch 2

The Batch 2 audit called `DriveResult` a "discriminated union mirrors `ReviewResult` pattern from `admin-application.ts`." That was actually incorrect — `ReviewResult = { error?: string; ok?: boolean }` is a flat union, not discriminated. Batch 2 accidentally introduced the stricter shape. Batch 3a's components exposed it. Now fixed.

**Lesson worth noting:** when defining a result type for a new action module, mirror an existing project pattern by *reading it*, not by naming it from memory. `ReviewResult` looks like it should be a discriminated union but isn't. Cf. CLAUDE.md Lesson 24 ("Before writing any 'REPLACE' file, search project knowledge for the actual current contents").

## Verification

**Typecheck:** clean via `npm run typecheck`.

## What's next

Ready for Batch 3b — the page rewrites:
- `components/admin/drive-editor-form.tsx` — full drive create/edit form (composed from Batch 3a components)
- `app/(admin)/admin/clubs/[slug]/recruitment/page.tsx` — REWRITE (drive list)
- `app/(admin)/admin/clubs/[slug]/recruitment/new/page.tsx` — NEW
- `app/(admin)/admin/clubs/[slug]/recruitment/[driveId]/page.tsx` — NEW
- Removal or repurposing of `components/admin/recruitment-section.tsx`

---

# 16A Round 2 Batch 3b — Drive editor form + pages + legacy cleanup (Shipped)

Final batch of Round 2. The user-facing admin experience for drive management is now end-to-end. Legacy `RecruitmentSection` + `StartNewRecruitmentButton` UI removed. Typecheck clean at every intermediate step + final.

## What shipped

### Additions

| Change | File | Notes |
|---|---|---|
| NEW | [components/admin/drive-editor-form.tsx](components/admin/drive-editor-form.tsx) | ~500 lines. Handles both `mode="create"` and `mode="edit"`. Uses `TargetYearsPicker` + `QuestionBuilder` from Batch 3a. Bottom action row is phase-aware: draft shows [Save draft] [Publish] [Delete]; open shows [Save] [Delete] (delete gated on `applicant_count === 0`); review/result disables everything. Soft-validation warnings (past deadline, result-before-deadline, junior-lead naming) render inline as clay-coloured notes. |
| NEW | [app/(admin)/admin/clubs/[slug]/recruitment/new/page.tsx](app/(admin)/admin/clubs/[slug]/recruitment/new/page.tsx) | Route target for the "+ New drive" button. Gates on `getEditableClub(slug)`. Renders `<DriveEditorForm mode="create">`. |
| NEW | [app/(admin)/admin/clubs/[slug]/recruitment/[driveId]/page.tsx](app/(admin)/admin/clubs/[slug]/recruitment/[driveId]/page.tsx) | Edit page. Gates on `getEditableClub(slug)`, then `getDriveWithQuestions(driveId)`, then a defensive `drive.club_id === editable.club.id` check. All three `notFound()` on miss. |

### Replacement

| Change | File | Before → After |
|---|---|---|
| REPLACE | [app/(admin)/admin/clubs/[slug]/recruitment/page.tsx](app/(admin)/admin/clubs/[slug]/recruitment/page.tsx) | Was single-recruitment editor via `<RecruitmentSection>`. Now a drive list via `listDrivesForClub(club.id)` + `<DriveListRow>` per row + "+ New drive" button in the header + empty-state card when no drives exist. Route URL unchanged (`/admin/clubs/[slug]/recruitment`) — old bookmarks land on the new UI naturally. |

### Deletions

| Change | File | Verification |
|---|---|---|
| DELETE | `components/admin/recruitment-section.tsx` | Pre-delete grep found 2 hits: (1) the file itself, (2) a documentation comment inside the new `recruitment/page.tsx` referencing `<RecruitmentSection>` as pre-16A history. No functional imports. Deleted; typecheck stayed clean. |
| DELETE | `components/admin/start-new-recruitment-button.tsx` | Pre-delete grep found 1 hit: the file itself. Only consumer was the now-deleted `recruitment-section.tsx`. Deleted; typecheck stayed clean. |

## Dead-code remaining (intentional per SETUP)

After Batch 3b, three legacy artifacts still exist but have zero live consumers. All are queued for a future maintenance sweep (likely 16D, the dedicated `clubs.is_recruiting` removal step):

| File / Symbol | Live consumers after Batch 3b |
|---|---|
| `lib/actions/club.ts` → `updateRecruitment` | None (grep: 1 hit — the definition itself). Was called only from the deleted `RecruitmentSection`. |
| `lib/actions/recruitment.ts` → `startNewRecruitment` | None (grep: 1 hit — the definition itself). Was called only from the deleted `StartNewRecruitmentButton`. Plus 1 comment reference in `lib/actions/drive.ts:60` pointing at it as the sibling with the same `as never` cast pattern. |
| `lib/actions/club.ts` → `updateClub` (back-compat shim of `updateClubContent`) | Unchanged status — was already dead code before 16A. |

Leaving these in matches the SETUP's explicit "safe to leave" instruction. Removal in a coherent sweep is safer than piecemeal deletion mid-step.

## Coexistence window from Batch 2 — now closed

The Batch 2 audit flagged that `updateRecruitment` (legacy) and `updateDrive` (new) could both edit an open recruitment via different code paths, creating a cross-tab write-race risk. With `RecruitmentSection` deleted, `updateRecruitment` has no UI caller — the coexistence window is closed. Only `updateDrive` reaches the RPC in production paths.

## Verification

**Typecheck runs (all clean):**
1. After 4 file drops, before deletions — pass
2. After `recruitment-section.tsx` deletion — pass
3. After `start-new-recruitment-button.tsx` deletion — pass

**Pre-deletion imports audit:**
- `grep -rn "RecruitmentSection"` → 2 hits (file + doc comment only)
- `grep -rn "StartNewRecruitmentButton"` → 1 hit (file only)

**Post-batch dead-action audit:**
```
lib/actions/drive.ts:60:  // type — same pattern used by startNewRecruitment in recruitment.ts.
lib/actions/club.ts:92:export async function updateRecruitment(
lib/actions/recruitment.ts:20:export async function startNewRecruitment(
```
Only definitions + one comment reference remain.

## Smoke test (user-runnable end-to-end)

Full 16A E2E — this is the first batch where the entire admin flow is usable through the UI.

**A. Drive creation → question CRUD → publish → post-publish edit → draft delete** — the full test path from `SETUP_STEP16A_ROUND2_BATCH3B.md` sections A-E is now runnable in the browser. Batch 1's "Test Draft 16A Batch 1" row from the raw INSERT is still in the DB (created outside the RPC) — safe to leave; will show in the drive list with `applicant_count: 0`.

**B. Legacy path safety** — visiting `/admin/clubs/shaurya/recruitment` renders the new drive list. Old URL, new UI.

## What 16A did NOT touch (16B / 16C / 16D queue)

- **Public apply flow** — students still see only the current published recruitment via the Batch-1-filtered queries. Multi-drive public flow is 16B.
- **`clubs.is_recruiting`** — still stored + admin-toggled from the club edit page. Removal is a dedicated future step.
- **No filter tabs on drive list** — flat list only. Adding All/Open/Review/Result/Draft tabs is a small follow-up once drives accumulate.
- **No per-drive pending-count** — `DriveListItem.applicant_count` is total-applications. 16B adds pending counts.
- **WhatsApp reveals** — interview at Review + community at Result — 16C.

## Round 2 summary

Across Batch 1 (foundation), Batch 2 (drive backend + audit), Batch 3a (building-block components), and Batch 3b (form + pages + cleanup), 16A shipped:

- **1 SQL schema migration + 1 SQL RPC migration** (Round 1, run by user via Supabase)
- **7 CLAUDE.md edits** documenting the design + lessons
- **3 new query files** (`admin-drives.ts`) + 1 replaced (`phase.ts`)
- **3 new validation + action files** (`drive.ts` × 2, updated audit metadata)
- **4 new components + 1 replaced + 2 deleted** (drive-editor-form + list-row + question-builder + question-editor-row + target-years-picker; recruitment-section + start-new-recruitment-button removed)
- **4 new pages + 1 replaced** (`recruitment/page.tsx` + `new/` + `[driveId]/` + supporting audit pill in `audit-log-view`)
- **~15 draft-filter defensive patches** on legacy "most-recent recruitment" queries across `lib/queries/`, `lib/actions/`, and `app/(student)/`
- **~5 phase-consumer patches** (draft banner + defensive null-returns + reject-draft in admin-application)
- **2 caught-and-fixed type bugs** (RPC-type mismatch on `create_drive`/`update_drive`; `DriveResult` shape convention mismatch)
- **3 dead-code artifacts** left in place for a future maintenance sweep

Ready for Sumanth's smoke test on Batch 3b. Once that clears, 16A is complete and 16B is the next step.

---

# 16A Batch 3b — Post-landing fixes (Shipped)

Three follow-up rounds after Batch 3b landed, driven by user smoke testing. Each is a targeted fix, not new scope.

## Round 1 — Server/Client boundary bug on `targetYearsLabel`

**Symptom:** `/admin/clubs/[slug]/recruitment` returned 500 with:
```
Error: Attempted to call targetYearsLabel() from the server but targetYearsLabel is on the client.
```

**Root cause:** `targetYearsLabel` — a pure formatting helper — was exported from `components/admin/target-years-picker.tsx`, which is `"use client"`. Next.js flags any file with `"use client"` as a client module; every export becomes a client-only reference. Server Components (like `DriveListRow` inside the server-rendered recruitment page) can only pass client-module exports as props to other Client Components, not call them during render.

**Fix:**
- **NEW** [lib/drive-format.ts](lib/drive-format.ts) — plain module (no `"use client"`), exports `targetYearsLabel`.
- **PATCH** [components/admin/target-years-picker.tsx](components/admin/target-years-picker.tsx) — removed the local export, added a one-line breadcrumb comment pointing at the new location.
- **PATCH** [components/admin/drive-list-row.tsx](components/admin/drive-list-row.tsx) — import path swapped from `@/components/admin/target-years-picker` to `@/lib/drive-format`.

**Post-fix Turbopack cache issue:** the source fix landed but the dev server kept serving stale compiled chunks — stack trace still pointed at `target-years-picker.tsx` after the edit. Resolved by `rm -rf .next` and `npm run dev` restart. Matches CLAUDE.md's dev-recipe note ("Clear `.next` after migrations"); every file rename / export move triggers the same class of Turbopack cache-miss.

**Lesson worth banking:** pure helpers should live in plain `lib/` modules, not co-located inside `"use client"` components. Reserved for `lib/format-*.ts` / `lib/*-format.ts` patterns going forward.

## Round 2 — UX rewrite of the drive editor bottom actions

**Symptoms (three, one round):**
1. Create page had only a "Save as Draft" button — user wanted Save Draft AND Publish side by side.
2. Edit page — Save changes (Section 1) and Publish (Section 3) were in visually separate sections.
3. Confusion about "Save changes" only persisting top-level fields while questions auto-save (per Batch 3a design).

**Design decision worth logging:** keep the split between top-level Save and per-row question auto-save. Rationale: batching question edits into a single Save would require tracking a per-question delta since load + reconciling partial-failure states (e.g. metadata saved, one question failed). Per-row auto-save is simpler + preserves immediate feedback. Made the split explicit via UI hints instead of erasing it.

**Fix:**
- **PATCH** [lib/actions/drive.ts](lib/actions/drive.ts) — extended `createDrive` to read a `publishAfter` form field. When `"true"`, action creates the drive then immediately calls `publish_drive` on the new id. If publish fails (e.g. missing deadline), the drive still exists as a draft; user retries from the editor.
- **REWRITE** [components/admin/drive-editor-form.tsx](components/admin/drive-editor-form.tsx):
  - Form now wraps only Section 1 (drive fields). Bottom action bar sits outside the form and uses HTML5 `form="drive-form"` association so buttons still trigger the correct submit.
  - Removed the standalone "Section 3: Go live" block. Publish button moved into the bottom action bar.
  - New sticky bottom action bar (`sticky bottom-4`) with mode-aware buttons:

    | Mode / Phase | Buttons |
    |---|---|
    | Create | `[Save as Draft]` + `[Save & Publish]` (submit buttons with `name="publishAfter" value="false"` / `"true"`) |
    | Edit / draft | `[Save changes]` + `[Publish drive]` (Publish opens confirm modal) |
    | Edit / open | `[Save changes]` only |
    | Edit / review or result | Bottom bar hidden entirely (read-only) |

  - `[Save & Publish]` is disabled unless name + target years + deadline are all filled (client-side gate mirroring RPC-side check).
  - `[Publish drive]` on edit/draft is disabled if drive is dirty ("Save your changes first" tooltip) or missing any publish requirement.
  - `PublishConfirmModal` extracted as its own component; still confirms before the irreversible action.
  - Danger zone kept as a separate section (delete is a different mental model from save/publish).
  - `useFormStatus` replaced with `useActionState`'s `isPending` — cleaner since buttons now live outside the form element.
  - Added clarity hints: "3 default questions will be added automatically…" on create page; "Questions save automatically as you edit…" on edit page questions section.

## Round 3 — Dirty-stuck race + datetime timezone shift

**Symptoms:**
1. "Unsaved drive changes" indicator sometimes stuck after successful save (when rapidly editing + saving).
2. On page reload after saving a deadline, the deadline value shifted forward by one day.
3. Browser's `beforeunload` popup fired even after successful save.

**Root cause 1 (stuck dirty):** old code cleared dirty via `useEffect(() => { if (state.ok) setDirty(false) }, [state.ok])`. Effect only fires on false→true transition; if `state.ok` was already `true` from a prior save, subsequent successful saves left the dep unchanged and the effect never re-fired. Only the FIRST successful save ever cleared the flag.

**Root cause 2 (timezone shift):** `<input type="datetime-local" name="deadline">` submits its value as `YYYY-MM-DDTHH:mm` with no timezone marker. Postgres reads that as UTC (session default). User in IST (UTC+5:30) typing `23:00` local → stored as `23:00 UTC` → reloaded as local `2026-07-16T04:30` (next-day drift). Roundtrip mismatch by 5-6 hours ≈ a day for any evening time.

**Root cause 3 (reload popup):** `useUnsavedChanges` triggers `beforeunload` when `dirty` is true. Downstream of stuck-dirty from cause #1.

**Fix:**
- **PATCH** [components/admin/drive-editor-form.tsx](components/admin/drive-editor-form.tsx):
  - Replaced the state.ok effect with an `isPending`-transition ref:
    ```tsx
    const wasPendingRef = React.useRef(false);
    React.useEffect(() => {
      if (wasPendingRef.current && !isPending && state.ok && !state.error) {
        setDirty(false);
      }
      wasPendingRef.current = isPending;
    });
    ```
    Fires on every completed save (deps-less runs every render + explicit transition check). `!state.error` guard leaves dirty true when a save fails so the user notices.
  - Split each datetime input into two elements: visible `type="datetime-local"` (state-driven, no `name`) + hidden `<input name="..." value={new Date(state).toISOString()}>`. The ISO conversion happens on the client where `new Date("...")` correctly interprets the naive local-time string using the browser's timezone.

**Lesson worth banking:**
- **`useActionState`'s `state` is sticky across dispatches for identical shapes.** If your effect needs to fire on every completed submit, watch `isPending` transitions, not `state.ok`.
- **`<input type="datetime-local">` submits timezone-less strings.** Anywhere this input feeds into a `timestamptz` column, either normalize client-side to ISO before submission or normalize server-side using the session's known timezone. Naive server-side `new Date(value).toISOString()` is wrong because Node's local time is usually UTC on serverless.

---

## Files touched across the three post-landing rounds

| Change | File | Round |
|---|---|---|
| NEW | [lib/drive-format.ts](lib/drive-format.ts) | 1 |
| PATCH | [components/admin/target-years-picker.tsx](components/admin/target-years-picker.tsx) | 1 |
| PATCH | [components/admin/drive-list-row.tsx](components/admin/drive-list-row.tsx) | 1 |
| PATCH | [lib/actions/drive.ts](lib/actions/drive.ts) — `createDrive` publishAfter handling | 2 |
| REWRITE | [components/admin/drive-editor-form.tsx](components/admin/drive-editor-form.tsx) — bottom action bar + hidden-input ISO normalization + isPending-transition dirty clear | 2 + 3 |

Typecheck stayed clean at each round. No SQL, no schema, no queries touched — all client-side and one server-action extension.

16B — Planning
Goal
Public apply flow refactored for multi-drive per club, with eligibility gates + dynamic questions. Students see drives filtered by their year, apply to one drive with its custom questions, admins review each drive independently.
Current state (post-16A)

Public apply page (/clubs/[slug]/apply) still uses the pre-16A "most recent published recruitment" pattern (Batch 1's draft filter keeps this correct for now)
Apply action still uses hardcoded motivation / experience / contribution fields (from lib/validation/application.ts)
Admin applications page shows all apps for the current recruitment (single drive)
/profile shows applications without drive-level context

Scope of 16B
Public side

Club detail page — surface "Open drives" section when any drive is in Open phase, listing all open drives with name + target years + apply CTA
New drive-specific apply page — either /clubs/[slug]/apply/[driveId] OR keep /clubs/[slug]/apply with a drive picker; leaning [driveId] route for cleaner state + shareable URLs
Dynamic question form — reads drive_questions and renders inputs per question (short_text vs long_text vs required)
Eligibility gate — student's year must be in drive.target_years; ineligible drives are shown but grayed with reason ("For 3rd-year students only")
Student profile applications view — show drive name + target years per application

Admin side

Applications page rework — shows apps grouped/filtered by drive (or drive picker at top); response rendering joins with drive_questions for prompt display
Per-drive pending count on DriveListItem — populate the count so DriveListRow shows real numbers

Server side

Rework submitApplication action to accept driveId + validate year eligibility server-side + parse dynamic responses against drive_questions
Update applications.responses jsonb shape: keyed by question_id instead of hardcoded field names
Backfill existing responses from {motivation, experience, contribution} → keyed by the corresponding auto-populated question ids

Sub-step split
Two sub-batches, mirroring how 16A worked:
16B Batch 1 — Server + queries + validation

Schema/data: backfill existing applications.responses to be keyed by drive_question ids (one-time migration)
lib/queries/apply.ts new — getOpenDrivesForClub(clubId, studentYear) + getDriveForApply(driveId, studentId) (returns drive + questions + eligibility state + existing application if any)
lib/queries/admin-drives.ts update — add pending_count to DriveListItem
lib/queries/admin-applications.ts update — add getApplicationsForDrive(driveId) fetching apps with responses joined against drive_questions for prompts
lib/validation/application.ts rewrite — dynamic Zod schema built from a drive's questions
lib/actions/application.ts rewrite — accept driveId, validate eligibility, validate against dynamic questions
Draft filter still applies to student-facing queries

~8 files. Migration is the risky part.
16B Batch 2 — Public + admin UI

Public /clubs/[slug] — add "Open drives" section
Public /clubs/[slug]/apply/[driveId] — new route + page + dynamic question form
Redirect /clubs/[slug]/apply (old URL) → drive picker or first open drive (backward compat)
Admin /admin/clubs/[slug]/applications — drive picker + response rendering with question prompts
/profile applications section — show drive context
DriveListRow — surface real pending count

~10 files.
Design decisions I need your call on
Six decisions. Answer with defaults if you agree, or push back.
1. Apply URL structure. Options:

A — /clubs/[slug]/apply/[driveId] (new nested route)
B — /clubs/[slug]/apply with ?drive=X query param
C — /clubs/[slug]/apply with a drive picker on-page

My pull: A. Shareable, bookmarkable, cleanest URL semantics. Old /clubs/[slug]/apply becomes either a redirect to the first open drive OR shows a picker if multiple. Let me know which fallback you want.
2. Responses JSONB shape. Old: {motivation: "...", experience: "...", contribution: "..."}. New: {"[question_uuid]": "..."}.
The backfill: existing recruitments got auto-populated with 3 questions in Round 1. Existing applications' responses map to those 3 questions by name (Why join / Experience / Contribute → in that sort_order). Migration finds the sort_order 0/1/2 question ids per recruitment and rekeys the JSONB.
My pull: do the backfill. Alternative (dual-read: old shape + new shape) is fragile and adds branching in every response reader. One-shot migration is cleaner.
3. Eligibility mismatch UX. Student's year is 2, drive targets years [3,4]. Options:

A — Drive card shown but grayed with "For 3rd & 4th year students only"; no Apply button
B — Drive card hidden entirely
C — Card shown, Apply button shown but blocked on submit with error

My pull: A — matches the 16B plan we agreed on ("greyed with eligibility message"). Educates the student without pretending options don't exist.
4. Multiple open drives — can a student apply to more than one? Your model doc says "one application per drive" but doesn't clarify cross-drive. Options:

A — Yes, student can apply to multiple concurrent drives (e.g., Technical Team AND Design Team)
B — No, one active application per club at a time

My pull: A. Matches "drives are independent" from your model. If Shaurya runs Technical + Design drives, a student can genuinely be interested in both. No structural reason to block.
5. applications.recruitment_id — keep or replace with drive_id?
The column IS the drive id. No rename needed. Just noting.
6. Response backfill: what if an existing application has data that doesn't map cleanly?
The 3 auto-populated questions might not match what an existing application's responses contain if a club had modified them pre-16A (which they couldn't, but defensively). My pull: abort migration if any application row has response keys other than the expected 3. Clean fail is better than silent data loss. If we're safe (nothing was editable pre-16A), migration proceeds; if not, we investigate.
What's NOT in 16B

clubs.is_recruiting removal — dedicated future step (16D)
WhatsApp reveals — 16C
Waitlist status — dropped
Question snapshots — dropped
Draft eligibility feedback ("you'll be eligible next year") — nice-to-have, deferring
Multi-select / choice question types — v2

answer to the questions

1. A

2.New only

3.A and we have a vulnerability to deal with, what if a 2year  student updates his profile to a 3 or 4 th year to imporsonate.

4.A

5.your take



6. lets drop the idea of 3 default questions let club decide what questions they need to put just like google forms, this resolves few issues which we are trying to solve. And one more thing if a club manager changes the drive questions or details when a student has already applied to the drive then those students must get a notification to update there application before deadline, there must be a soft warning also when the club managers try to change the details when >1 application present for that drive, as this will not effect any of our task now we can work on it later.

and can we add this now?
Multi-select / choice question types — v2

---

# 16B Batch 1 — Server-side (Shipped)

Pre-req SQL migration + 5 TypeScript files. Typecheck clean. Answer-block from Planning section is now locked in.

## Decisions locked from Planning

| # | Question | Answer |
|---|---|---|
| 1 | Apply URL structure | A — `/clubs/[slug]/apply/[driveId]` nested route (Batch 2) |
| 2 | Responses JSONB shape | New only |
| 3 | Eligibility mismatch UX | A — greyed card with "For X-year students only" message |
| 3-security | Year impersonation defense | Defer to dedicated post-16 step. Trust `profile.year` in Batch 1. |
| 4 | Multiple concurrent applications per student | A — allowed |
| 5 | `applications.recruitment_id` column name | Keep — the column IS the drive id |
| 6a | 3 default questions | Dropped. Rewritten `create_drive` skips auto-populate. |
| 6b | Applicant-notification on edit-after-apply | Deferred |
| 6-migration | Old-shape responses on existing drives | Wipe all drive_questions + purge all applications (option 3 combined with option 2) |

## What shipped

### SQL migration (user runs manually via Supabase)

| Change | File | Impact |
|---|---|---|
| NEW | [supabase/16b_drop_defaults.sql](supabase/16b_drop_defaults.sql) | Purges all `applications` rows (bypassing the `enforce_application_phase` trigger via GUC), wipes all `drive_questions` rows, and rewrites `create_drive` RPC to skip the 3-question auto-populate. Includes sanity-check queries at the bottom. Cascade-safe: `club_members` are unaffected (they live independently of applications post-publish). |

### New TypeScript files

| Change | File | Purpose |
|---|---|---|
| NEW | [lib/queries/apply.ts](lib/queries/apply.ts) | Student-facing queries. `getOpenDrivesForClub(clubId, studentId, studentYear)` returns Open-phase drives annotated with per-student `eligible` + `has_applied` + `application_status`. `getDriveForApply(driveId, studentId, studentYear)` returns drive metadata + questions + existing application (for re-apply / edit). Both filter drafts implicitly via `.not("published_at", "is", null)` and reject non-Open phases. |

### Modified TypeScript files

| Change | File | Notes |
|---|---|---|
| PATCH | [lib/queries/admin-drives.ts](lib/queries/admin-drives.ts) | Added `pending_count: number` to `DriveListItem`. `listDrivesForClub` now runs a second query (grouped `SELECT status FROM applications WHERE recruitment_id IN (…) AND status IN ('pending','reviewing')`), maps counts to drive ids, and populates the new field. Supabase's embedded-resource count doesn't support filtered aggregates on the same relation, so a second round-trip is needed. Cheap: no per-drive N+1 — one query for all drives. |
| PATCH | [lib/queries/admin-applications.ts](lib/queries/admin-applications.ts) | Added `getApplicationsForDrive(driveId)` returning `{ drive, applications, counts }`. `drive` includes the question set (for prompt lookup when rendering responses). Rejects drafts + never returns for non-existent drives. Existing `getApplicationsForClub` / `getApplicationCountsForClub` / `getApplicationHistoryForClub` unchanged — Batch 2 rewires the admin apps page to switch consumer. |
| REWRITE | [lib/validation/application.ts](lib/validation/application.ts) | Removed the static `applicationSchema` + `{motivation, experience, contribution}` shape. New exports: `buildResponseSchema(questions)` builds a Zod object keyed by question id; `normalizeResponsesInput(raw, questions)` trims + maps empty-string to undefined so optional questions don't fail their `.optional()` guard. Length policy: `short_text` max 250, `long_text` max 2000. |
| REWRITE | [lib/actions/application.ts](lib/actions/application.ts) | `submitApplication` now reads `driveId` + `q_<question_id>` form fields, gates on phase (`open`) + eligibility (`profile.year ∈ target_years`) + presence of ≥1 question + Zod validation against the drive's live question set. Sensible errors surfaced per gate (`"Complete your profile (add your year) before applying"`, `"This drive is only for Year N students"`, `"This drive doesn't have any questions yet"`). `editApplication` follows the same dynamic-response path. `withdrawApplication` unchanged apart from adding `published_at` to the recruitment selection so `getPhase` sees a valid draft-vs-open signal. |

## Design notes

- **Two-query pending-count in `listDrivesForClub`.** Supabase's `applications(count)` embedded aggregate doesn't accept `where status IN (...)`. The two-query approach avoids a per-drive N+1 and keeps the pending-count filterable at the Postgres level. Migrating to a SECURITY DEFINER RPC that returns a materialized view is possible later if this hot path stretches.
- **Draft filter unchanged.** Every 16A draft-filter patch (from Batch 1 of Round 2) still applies. `apply.ts` queries add the same `.not("published_at", "is", null)` filter directly — drafts never leak into the public apply flow.
- **Eligibility on `apply.ts` uses live `profile.year`.** No snapshot on application row. If the user changes their profile year later, admin views current year. This is the Round-3-planning-deferred vulnerability — logged for a dedicated defense step.
- **`applications.recruitment_id` unchanged.** The column IS the drive id post-16A. No rename, no dual-write. Query readers use it as-is.
- **UI consumers of the removed `motivation` / `experience` / `contribution` keys** (`components/clubs/apply-form.tsx`, `components/profile/application-row.tsx`, `components/admin/application-review-row.tsx`) — Batch 2 rewrites all three. During Batch 1 coexistence they will render `undefined` where they previously read those keys; the app builds/typechecks fine because those files declare local response types instead of importing from `validation/application.ts`. Behaviorally: existing apply-form submission would return `"Missing drive id."` since it doesn't send one — but the migration purges pre-16A applications and prevents submits against zero-question drives, so this is a coexistence window with no real user-facing regression: pre-16B applications are gone, and new ones aren't accepted until Batch 2 ships the new form.

## Migration risks worth flagging

1. **Data loss is deliberate.** All `applications` rows are deleted. All `drive_questions` rows are deleted. Club members are untouched. If any real production application was submitted since the 2026-06-17 deploy that you'd want to preserve, back it up before running the migration. The user-confirmed decision was "wipe" — this audit records that.
2. **Existing published drives become question-less.** After migration, any drive currently in Open phase has zero questions until an admin adds some via the Batch-3b drive editor. `submitApplication` returns a friendly `"This drive doesn't have any questions yet — check back once the club has set them up."` in that state. Admins should be told to add questions ASAP after running the migration if any drives are currently taking applications.
3. **`publish_drive` still requires ≥1 question.** Unchanged. New drives cannot be published until at least one question exists. This is enforced at the RPC layer, not just the UI.

## Files that must change in Batch 2 (per audit plan)

| File | Purpose |
|---|---|
| `app/(marketing)/clubs/[slug]/page.tsx` (patch) | Add "Open drives" section listing open drives with apply CTA per year eligibility |
| `app/(student)/clubs/[slug]/apply/page.tsx` (rewrite or redirect) | Old URL → redirect to first open drive OR drive picker |
| `app/(student)/clubs/[slug]/apply/[driveId]/page.tsx` (new) | Drive-specific apply page rendering dynamic question form |
| `components/clubs/apply-form.tsx` (rewrite) | Dynamic question form; renders per-question inputs from `drive_questions` |
| `app/(admin)/admin/clubs/[slug]/applications/page.tsx` (rewrite) | Drive picker at top; response rendering joins with prompts |
| `components/admin/application-review-row.tsx` (rewrite) | Response block renders `{ [question_id]: value }` against prompt lookup |
| `components/profile/application-row.tsx` (rewrite) | Show drive name + target years context |
| `components/profile/applications-list.tsx` (patch if needed) | Group / label per drive |
| `components/admin/drive-list-row.tsx` (patch) | Surface `pending_count` field |

## Verification

**Typecheck:** clean via `npm run typecheck`.

**Migration smoke test** (user runs after `16b_drop_defaults.sql`):
```sql
select count(*) as applications_remaining from applications;
-- expect: 0
select count(*) as drive_questions_remaining from drive_questions;
-- expect: 0
select count(*) as drives_total from recruitments;
-- unchanged from before
select count(*) as club_members_untouched from club_members;
-- unchanged
```

**Query smoke test** (post-migration):
- `getOpenDrivesForClub(clubId, studentId, studentYear)` returns your currently-open drives with `eligible` field reflecting whether the student's year is in each drive's `target_years`
- `getDriveForApply(driveId, ...)` returns null for draft/review/result drives; returns the drive + empty questions array for a post-migration drive with no questions added yet
- `listDrivesForClub(clubId)` still returns all drives (draft + open + review + result); `pending_count` is 0 across the board (no applications exist)

## What Batch 1 does NOT touch

- Any UI file (Batch 2 owns all UI changes)
- `clubs.is_recruiting` handling (dedicated future step, 16D)
- Applicant notification on drive edit (deferred per Item 6b)
- WhatsApp reveals (16C)
- Year-impersonation defense (deferred to dedicated post-16 step)

Ready for the SQL migration + typecheck confirmation. Once you say "Batch 1 clean," Batch 2 ships the UI layer.
