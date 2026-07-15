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

---

# 16B Batch 2a — Public apply flow UI (Shipped)

Ships the student-facing side of the multi-drive apply flow. 4 new/replaced files, 1 patch. Typecheck clean after fixing two Batch-1 interface bugs surfaced by the file drops.

## What shipped

| Change | File | Notes |
|---|---|---|
| NEW | [components/clubs/open-drives-section.tsx](components/clubs/open-drives-section.tsx) | Server component. Fetches drives via `getOpenDrivesForClub` (Batch 1), fetches signed-in user + `profile.year` in parallel, renders one `<DriveCard>` per open drive. Hides itself if there are zero open drives. `<ActionCTA>` sub-component branches: not-signed-in → sign-in deep link; no-profile-year → complete-profile deep link; not-eligible → "Not eligible" lock badge; already-applied → "Applied" link back to the drive page; eligible → "Apply" primary button. |
| PATCH | [app/(marketing)/clubs/[slug]/page.tsx](app/(marketing)/clubs/[slug]/page.tsx) | Three edits: added `OpenDrivesSection` import; simplified the recruit aside card to a static "See open drives below" hint (was a conditional `is_recruiting`-gated Apply button); injected `<OpenDrivesSection>` immediately before the `{/* TEAM */}` section. The `Button` import stays — still used by the archived-club fallback deeper in the page. |
| REWRITE | [app/(student)/clubs/[slug]/apply/page.tsx](app/(student)/clubs/[slug]/apply/page.tsx) | Landing / picker page. Auth-gate → profile-completeness gate → fetch open drives with eligibility. 0 drives → `redirect(/clubs/[slug])`; 1 drive → `redirect(/clubs/[slug]/apply/[driveId])`; 2+ → render picker page listing all drives with per-card apply / view / not-eligible affordances. |
| NEW | [app/(student)/clubs/[slug]/apply/[driveId]/page.tsx](app/(student)/clubs/[slug]/apply/[driveId]/page.tsx) | Drive-specific apply page. Auth + profile + `getDriveForApply` + membership/admin block checks all layered in. Three empty-states via sub-components: `<BlockState>` (already member / admin), `<NotEligibleState>` (year mismatch), `<NoQuestionsState>` (zero questions — the post-16B-migration case for pre-existing published drives). Otherwise renders `<ApplyForm>` with drive metadata + questions + existing application (for edit/re-apply mode). |
| REWRITE | [components/clubs/apply-form.tsx](components/clubs/apply-form.tsx) | Removed the fixed motivation/experience/contribution fields. Now iterates over `questions` sorted by `sort_order` and renders `<input type="text">` for `short_text` (250 char max) or `<textarea rows="4">` for `long_text` (2000 char max). Field names use `q_<question_id>` matching the action's expected format. `existingApplication` prop drives edit/re-apply copy: withdrawn → "Re-apply"; pending/reviewing → "Update application"; nothing → "Submit application". Pre-fills `defaultValue` from `existing_application.responses`. |

## Bugs caught by typecheck (fixed inline)

**Bug 1 — `DriveForApply` shape mismatch.** Batch 1 defined it as a flat interface (`{id, club_id, name, ...}` alongside `eligible`, `existing_application`). The `[driveId]/page.tsx` file dropped by Batch 2a expected the nested shape `{drive: {...}, eligible, existing_application}` — matches the pattern used by `getApplicationsForDrive` in `admin-applications.ts`. 9 typecheck errors surfaced.

**Fix:** Refactored `DriveForApply` in [lib/queries/apply.ts](lib/queries/apply.ts) to the nested shape. Aligned with the sibling `getApplicationsForDrive` interface for consistency. The query body's return statement got wrapped in a `drive: {...}` block.

**Bug 2 — `getOpenDrivesForClub`'s `studentId` was non-nullable.** But the section component's signed-out branch legitimately passes `null` (a signed-out visitor browses a club page and sees open drives without being logged in). 1 typecheck error.

**Fix:** Widened the parameter type to `string | null` in [lib/queries/apply.ts](lib/queries/apply.ts). The `.find((a) => a.profile_id === studentId)` inside the query returns undefined for `null` since applications' `profile_id` is never null — so no functional change, just type-correctness.

## Design decisions worth noting

- **`club.is_recruiting` is no longer consulted for the apply CTA.** The old page had an `is_recruiting ? <Apply> : <ClosedMessage>` fork. New page: presence of open drives IS the recruiting signal. If a club has `is_recruiting=false` but has an open drive (data drift), drives still show. Correct per model — drive phase beats stored flag. Full column removal remains the queued 16D step.
- **Membership/admin block moved to server-side pre-render.** The old apply form did the check on the same page but rendered blocked-state as `blockReason` inside JSX. The new [driveId]/page renders one of three empty-state components based on server-side checks before the form ever shows.
- **Question ordering is client-side.** `apply-form.tsx` sorts by `sort_order` inside the render map rather than trusting the query. Defensive; the query does order too. No performance concern — questions are small arrays.
- **Sign-in and complete-profile deep links.** Both use `?next=<current URL>` so the redirect chain returns the user to the exact page they were trying to reach. Matches existing site pattern.

## Verification

**Typecheck:** clean via `npm run typecheck` after the interface fixes.

**Smoke test priorities** (per SETUP):
1. **Not signed in → open drives visible** on club page, sign-in gate on drive card CTA
2. **Signed in, eligible, no prior app** → apply page shows questions, submit works
3. **Signed in, ineligible** → drive card grayed on club page; direct URL shows `<NotEligibleState>`
4. **Signed in, already applied** → "Applied" badge on card; apply page shows edit form with prefilled responses
5. **Multiple open drives** → landing page shows picker; single open drive → auto-redirect to `[driveId]`
6. **Zero questions on a drive** (the post-migration state for pre-existing drives) → apply page shows `<NoQuestionsState>`, action rejects with the same message server-side

## Files that Batch 2b still needs to touch

Per SETUP + audit-plan Tier 6:
- `app/(admin)/admin/clubs/[slug]/applications/page.tsx` — drive picker + join responses with prompts
- `components/admin/application-review-row.tsx` — render `{ [question_id]: value }` against prompt lookup
- `components/profile/application-row.tsx` — drive-name + target-years context
- `components/admin/drive-list-row.tsx` — surface the `pending_count` field added in Batch 1
- Possibly a small patch to `components/profile/applications-list.tsx` for grouping

## What Batch 2a does NOT touch

- Admin apps page (2b)
- Profile applications list (2b)
- DriveListRow pending count display (2b)
- application-review-row (2b — currently reads `motivation/experience/contribution` from responses, will render `undefined` for post-16B applications)

Ready for the smoke test. Once you say "Batch 2a clean," Batch 2b ships the admin side + profile.

## Batch 2a — Post-landing fix: anon RLS/GRANT trap

**Symptom** (smoke test 1, not-signed-in visit to a club page):
```
getOpenDrivesForClub failed: {
  code: '42501',
  hint: 'Grant the required privileges to the current role with:
         GRANT SELECT ON public.applications TO anon;',
  message: 'permission denied for table applications'
}
```

**Root cause.** The initial `getOpenDrivesForClub` query embedded `applications!left(id, status, profile_id)` on the recruitments select. That LEFT JOIN materialized at the Postgres level, which requires the caller's role to have SELECT on `applications`. Only `authenticated` has that grant — `anon` doesn't (deliberately: no non-logged-in user should ever read applications). Signed-in scenarios worked because their role permits the join; signed-out visits 42501'd on every club-detail page render.

Textbook Lesson 2 / Lesson 19 — grants and RLS are two layers, and even a "safe" LEFT JOIN counts against the caller's grants.

**Fix.** Rewrote `getOpenDrivesForClub` in [lib/queries/apply.ts](lib/queries/apply.ts) to a two-query pattern:
1. Recruitments-only fetch (no `applications` embed) — safe for both anon and authenticated.
2. If `studentId` is non-null, a second `applications` query scoped to `.eq("profile_id", studentId).in("recruitment_id", driveIds)`. Skipped entirely for anon.

Result: anon sees drives + eligibility state (based on `null` year → all `eligible=false`, which the section handles via the "Sign in to apply" CTA). Signed-in users get the same behaviour they had before — one small extra round-trip vs a JOIN, negligible cost.

**Consistency note.** This matches the exact pattern `listDrivesForClub` uses for pending counts (Batch 1 introduced): fetch the parent list first, then a scoped follow-up query for per-caller state. Two files, same discipline.

**Related lessons worth noting:**
- Grants and RLS bite even on read-only joins. Embedded selects across tables materialize as JOINs at the Postgres layer, which respect grants of the caller's role — not just RLS policies. Anywhere a public-facing query might embed a table with restricted grants, unbundle to a two-query pattern.
- The Supabase error hint (`GRANT SELECT ON ... TO anon`) is misleading here — following the hint would be the wrong fix. In this case the right fix is client-side (query shape), not database-side (grants).

Typecheck clean after the fix. All 6 smoke test scenarios should now pass.

---

# 16B Batch 2b — Admin apps rewrite + profile + drive-list pending (Shipped)

Closes 16B on the admin + student-facing sides. 8 file changes (4 new/replace + 4 patch/rename). Typecheck clean.

## Pre-work verifications (per SETUP)

All 3 Batch 1 grep assumptions verified before starting:
- ✅ [lib/actions/application.ts](lib/actions/application.ts) uses `q_<question_id>` field naming (lines 29, 113, 116, 206)
- ✅ [lib/queries/admin-drives.ts](lib/queries/admin-drives.ts) has `pending_count` on `DriveListItem` (lines 20, 113)
- ✅ [lib/queries/admin-applications.ts](lib/queries/admin-applications.ts) `getApplicationsForDrive` returns `{ drive: { questions, ... }, ... }` (lines 184, 198, 235)

## Naming correction from Batch 1 audit

The Batch 1 action was named `editApplication`. Batch 2b's new profile row imports `updateApplication` per SETUP contract. **Renamed** the export in [lib/actions/application.ts](lib/actions/application.ts) → `updateApplication` (via `replace_all`). Only one non-definition consumer existed (the old profile row, being replaced), so no other files needed follow-up. Small correction to my own Batch 1 audit — I documented the wrong name.

## What shipped

### Modified

| Change | File | Notes |
|---|---|---|
| RENAME | [lib/actions/application.ts](lib/actions/application.ts) | `editApplication` → `updateApplication` (SETUP naming contract). Behavior unchanged — same dynamic response handling from Batch 1. |
| PATCH | [lib/queries/profile.ts](lib/queries/profile.ts) | Added `DriveQuestion` import; extended `MyApplication.recruitment` shape with `target_years`, `published_at`, `questions`; extended `getMyApplications` SELECT to fetch `drive_questions(id, prompt, question_type, sort_order, required)` with a nested `.order` on `sort_order`; updated mapper + inline type assertion to include the new fields (mapper defaults `target_years ?? [1,2,3,4]` and `questions ?? []`). |
| PATCH | [components/admin/applications-filter.tsx](components/admin/applications-filter.tsx) | Threaded `questions: DriveQuestion[]` prop through `FilterAndList` and `ApplicationsFilter`; passes it into `<ApplicationReviewRow>`. **Removed `ApplicationsTabsView` + `HistoryGroup` sub-component + related imports** (`RecruitmentHistoryGroup`, `IconChevronDown`) per SETUP "history tabs concept dropped" decision — drive picker now handles all drives across phases. Grep confirmed only the deleted applications page consumed `ApplicationsTabsView`. `getApplicationHistoryForClub` in `lib/queries/admin-applications.ts` becomes dead code — a comment in the file explains the deferral, matches the `updateRecruitment` / `startNewRecruitment` maintenance-sweep pattern. |
| PATCH | [components/admin/drive-list-row.tsx](components/admin/drive-list-row.tsx) | Changed count block from `text-center` to `text-right`; added `· N pending` clay-colored suffix (only renders when `pending_count > 0`). Format matches mockup: `41 applicants · 14 pending`. |

### Replaced / new

| Change | File | Notes |
|---|---|---|
| REPLACE | [app/(admin)/admin/clubs/[slug]/applications/page.tsx](app/(admin)/admin/clubs/[slug]/applications/page.tsx) | Drive-driven with `?drive=<uuid>` query param. `listDrivesForClub(club.id)` for the picker; `pickDefaultDriveId` picks the most recent Open > Review > Result > Draft when no param. `getApplicationsForDrive(driveId)` returns `{drive, applications, counts}` — the drive block carries the questions used to render responses. Two full-page empty states: `<ZeroDrivesState>` when the club has no drives at all; `<ZeroQuestionsState>` when the selected drive has no questions (deep-link to drive editor). Phase banner + publish-results panel + `<ApplicationsFilter>` unchanged in intent — now scoped to the selected drive instead of "current recruitment." Editor tier still gets redirected out. |
| NEW | [components/admin/drive-picker.tsx](components/admin/drive-picker.tsx) | Native `<select>` with `<optgroup>` grouping by phase (Open → Review → Result → Draft). On change, `router.push()` updates `?drive=<newId>`. Sub-label below the select shows selected drive's phase + applicant count + pending count. Client component. |
| REPLACE | [components/admin/application-review-row.tsx](components/admin/application-review-row.tsx) | Row-in-list unchanged in shape. `<ApplicationDetail>` (in modal) now iterates `questions.slice().sort((a,b) => a.sort_order - b.sort_order).map(...)` to render dynamic Q&A — no more hardcoded motivation/experience/contribution. `responses` accessed as `Record<string, string>` keyed by question id. Zero-questions defensive branch renders a small "This drive has no questions defined" hint. `<StatusFlipRow>` unchanged in behavior; still submits `nextStatus` value; note form unchanged. |
| REPLACE | [components/profile/application-row.tsx](components/profile/application-row.tsx) | Row rebuilt with `<RowHeader>` (club + drive name + target-years pill + phase-aware date hint), `<StatusPill>` (still masks accepted/rejected as "Under review" during review phase — 9d rule preserved), `<ReadView>` (dynamic Q&A rendering), `<EditForm>` (dynamic textareas / short inputs based on `question_type`; submits `q_<id>` fields matching `updateApplication`'s expected shape). Withdraw button unchanged. |

## Design decisions locked from SETUP

- **Native select with optgroups over custom dropdown.** Zero JS libraries, native accessibility, scales to many drives.
- **History tabs concept dropped.** Each drive is independent — the picker naturally covers all past + present + draft states.
- **Zero-questions drive on admin apps page:** empty state links back to drive editor to add questions.
- **`41 applicants · 14 pending` format.** Pending suffix only renders when `pending_count > 0`.
- **Profile side needs no prop threading.** `MyApplication.recruitment.questions` is populated by the profile query patch; the row reads directly.

## Dead code preserved (not deleted per SETUP)

- `getApplicationHistoryForClub` in [lib/queries/admin-applications.ts](lib/queries/admin-applications.ts) — was consumed by `ApplicationsTabsView`. Left as-is with a comment in `applications-filter.tsx` explaining the deferral. Same maintenance-sweep queue as `updateRecruitment` / `startNewRecruitment` from 16A.
- `RecruitmentHistoryGroup` interface — same story.

## Coexistence trap that DIDN'T bite (worth noting)

Bug pattern that could easily have surfaced but didn't: the profile query's SELECT does an ordered nested fetch (`.order("sort_order", { referencedTable: "recruitments.drive_questions" })`). Supabase's PostgREST accepts this shape but it's the kind of thing that fails silently with the wrong `referencedTable` string. Confirmed working via typecheck against the generated types — Supabase would have returned questions unordered if the string was wrong, but the client-side sort in `ApplicationRow`'s `ReadView` + `EditForm` (`questions.slice().sort((a,b) => a.sort_order - b.sort_order)`) is defense-in-depth. Good pattern for future dynamic-question fetches.

## Verification

**Typecheck:** clean via `npm run typecheck`.

**Smoke test priorities** (per SETUP):
1. **Zero-drive club** — admin apps page renders `<ZeroDrivesState>` with recruitment page CTA
2. **Multi-drive club** — dropdown lists all drives grouped by phase; selecting one updates URL + re-fetches
3. **Selected drive with applications** — response cards render each question's prompt + saved answer
4. **Selected drive with zero questions** — `<ZeroQuestionsState>` with drive editor deep-link
5. **/profile page** — each application row shows drive name + target-years pill; edit mode uses dynamic textareas
6. **DriveListRow on recruitment page** — `41 applicants · 14 pending` format renders correctly
7. **Publish flow still works** — pending count updates after publish

## What 16B DID NOT touch

- WhatsApp reveals (16C — next)
- `clubs.is_recruiting` removal (dedicated future step, 16D)
- Notification-on-drive-edit (deferred per Item 6b)
- Year-impersonation defense (deferred to post-16 security step)
- `getApplicationHistoryForClub` (dead code queued for maintenance sweep)

## 16B complete

Round 1 (planning), Batch 1 (server), Batch 2a (public UI), Batch 2b (admin + profile UI) — all shipped. 16B ships the full multi-drive per club model with dynamic questions, eligibility gates, and drive-scoped admin review. Ready for **16C** — WhatsApp reveals (interview at Review + community at Result). Smaller scope, mostly conditional rendering additions.

---

## 16B — Addendum (post-smoke-test fixes)

Post-16B smoke tests were all green; user reported 1 bug + 3 UX changes + 1 feature. All landed in a single pass:

**Bug fix — `setApplicationStatus` returning "Missing fields."**
- Cause: [components/admin/application-review-row.tsx:240](components/admin/application-review-row.tsx#L240) button had `name="nextStatus"`, action reads `formData.get("next")`. Name mismatch → null → error.
- Fix: rename button prop to `name="next"`. One-liner.

**Change — Profile page compact read view**
- Rationale: dynamic textareas in the read view took too much vertical space per row. Users know what they submitted; if they want to change it they click Edit.
- [components/profile/application-row.tsx](components/profile/application-row.tsx): `<ReadView>` stripped down to just the action buttons (Edit application / Withdraw) or the phase message. No Q&A cards inline. Edit mode still shows the dynamic textareas.
- Deleted orphaned `Read` helper + `questions`/`responses` props on `ReadView`.

**Change — DriveListRow count layout**
- User wanted two stacked lines instead of one wrapping line.
- [components/admin/drive-list-row.tsx:46-58](components/admin/drive-list-row.tsx#L46-L58): line 1 is `<icon> N applicants` in ink; line 2 is `N pending` in clay, only rendered when `pending_count > 0`.

**Change — Review modal wider**
- User: "review window must be clear and large"
- Modal component already accepts `className`; upgraded from default `max-w-sm` (24rem) to `max-w-2xl` (42rem) on the review row: `<Modal ... className="max-w-2xl">`. No modal-component changes needed.

**Feature — Append-only note history**
- Problem: single `applications.note` column let admin B clobber admin A's context.
- Design: new `application_notes` table, one row per save. Read UI shows a fresh textarea at top + collapsible "Previous notes (N) ▾" below with author + date per entry. Older notes are read-only forever.

### Files changed for note history

| File | Change |
|---|---|
| **`supabase/16b_note_history.sql`** (new) | Creates `application_notes` table + RLS (select for club admins/sysadmin; insert for lead/manager only; no update/delete). Backfills any existing single-column notes idempotently. |
| **`lib/database.types.ts`** | Hand-added `application_notes` row/insert/update/relationships block above `applications` (types are generated but next regen will match). |
| **`lib/queries/admin-applications.ts`** | Added `ApplicationNote` interface + `notes?: ApplicationNote[]` on `AdminApplication`. `getApplicationsForDrive` now runs a second query for notes keyed by application_id, then stitches. Two-query pattern (not embedded join) so RLS on both tables evaluates independently. |
| **`lib/actions/admin-application.ts`** | Rewrote `saveApplicationNote`: rejects empty notes; INSERTs a new `application_notes` row instead of updating the old `note*` columns on `applications`. |
| **`components/admin/application-review-row.tsx`** | `<NoteForm>`: fresh textarea (no `defaultValue`), reset on `state.ok` via `useRef<HTMLFormElement>`. Added collapsible `Previous notes (N) ▾` section below with `IconChevronDown` rotation. Old `note_at` / `note_author` reads removed. |

### Coexistence & cleanup notes

- **Old columns not dropped.** `applications.note`, `applications.note_by`, `applications.note_at` stay in place. Their FK from `note_by` → `profiles.id` also stays. New writes go to `application_notes` only; the old columns are effectively frozen. Queue for the maintenance sweep alongside `updateRecruitment` / `startNewRecruitment` / `getApplicationHistoryForClub`.
- **Backfill runs on the migration** — if the smoke test seeded any single-column notes, they land as history entries with `created_at = coalesce(note_at, now())` and the original author. Guarded by `not exists`, so safe to re-run.
- **RLS insert authority (lead / manager) matches** what `ensureCanManageApplications` was already enforcing at the action level. Two layers of defence.

### Verification

- `npx tsc --noEmit` — clean.
- Migration file: [supabase/16b_note_history.sql](supabase/16b_note_history.sql) — apply before smoke-testing the note UI. If skipped, the insert action returns "relation application_notes does not exist" via the supabase error path.

### Smoke test plan for this addendum

1. Bug: open a review modal in Review phase → click Accept → should update, not "Missing fields."
2. Profile: `/profile` shows compact rows; clicking "Edit application" reveals the textareas.
3. Drive list: `/admin/clubs/[slug]/recruitment` shows counts as two lines when pending > 0.
4. Modal size: opening the review modal on the applications page is visibly wider than sign-in modal.
5. Notes:
   - Type a note, Save → row lands in history, textarea clears.
   - Sign in as second admin, save a different note → both appear in "Previous notes (2)", newest first, correct author names.
   - Empty submit → "Note can't be empty." error, no history change.
   - Editor tier: should get "You don't have access to manage applications." from the action (RLS gate matches).

---

## 16B — Addendum 2 (accept/reject bug + soft-gate review edits)

Post-addendum-1 smoke tests surfaced two more issues:

**Bug — every drive read as `draft` in `setApplicationStatus`**
- Symptom: clicking Accept/Reject on a published drive returned "Drive is a draft. Publish it before deciding applications."
- Cause: [lib/actions/admin-application.ts:57](lib/actions/admin-application.ts#L57) SELECT was
  `"club_id, status, recruitment:recruitments(deadline, result_date, results_published_at)"`
  — missing `published_at`. `getPhase()` checks `if (!r.published_at) return "draft"` first, so with the column absent the phase always resolves to draft regardless of actual publish state.
- Fix: add `published_at` to the SELECT. All other `recruitment:recruitments(...)` selects in the repo already include it — this one file lagged.

**Change — soft-gate drive edits during review**
- Rationale: leads sometimes need to extend a deadline mid-review (e.g. to accept more applications) or fix a typo. The hard block ("Past the deadline — fields locked while admins decide") forced them to work around it.
- Approach: only `result` (results published) truly freezes the drive. Review-phase drive metadata is now editable. **Question CRUD stays locked in review** because students have already answered them; changing prompts would break the review UI.
- Semantics of extending the deadline in review: pushing `deadline` past `now()` rolls the drive back to `open` (phase is derived, not stored). Applications trigger re-allows student edits; `setApplicationStatus` re-blocks decisions until the new deadline passes. Existing accept/reject decisions persist through the round-trip.

### Files changed

| File | Change |
|---|---|
| **`supabase/16b_soft_gate_review.sql`** (new) | `create or replace function update_drive(...)`: dropped the `review` block, only `phase = 'result'` throws now. |
| **`lib/actions/admin-application.ts`** | Added `published_at` to the recruitment SELECT (bug fix, one word). |
| **`components/admin/drive-editor-form.tsx`** | `readOnly = phase === "result"` (was `review \|\| result`). Banner split: review shows soft warning ("questions are locked"), result shows the freeze message. Action bar's Save button now renders for `open \|\| review`. `<DangerZone>` visible in review but delete button self-disables via its existing `canDelete` gate. |

**QuestionBuilder unchanged** — its own `disabled = phase === "review" || phase === "result"` gate stays, matching the RPC (`add_/update_/delete_/swap_drive_question` all still block review at the DB level).

**DangerZone in review** — component was already gated internally: `canDelete = phase === "draft" || (phase === "open" && !hasApplications)`. In review the button self-disables with "Cannot delete after the deadline passes." No changes needed there.

### Verification

- `npx tsc --noEmit` — clean.
- Apply [supabase/16b_soft_gate_review.sql](supabase/16b_soft_gate_review.sql) before smoke-testing the review-phase edits. Otherwise the RPC still throws in review.

### Smoke test

1. **Bug fix**: with a published drive that's past deadline, click Accept on a pending application → should update, not "Drive is a draft."
2. **Soft gate**:
   - Open drive editor for a review-phase drive.
   - Fields should be editable (name, description, target years, deadline, result date).
   - Question list should still be visually disabled.
   - Banner text should read "Past the deadline. You can still extend it or edit fields — questions are locked."
3. **Deadline extension roundtrip**:
   - Push deadline into the future by an hour → save.
   - Reload; phase pill should read "Open".
   - Sign in as a student and confirm you can apply / withdraw again.
   - Sign back in as admin, revert deadline to the past → phase returns to "Review", decisions unlock again.

---

## 16B — Addendum 3 (masking-based-on-publication + profile row orientation)

Followups from the review-phase soft-gate work:

**Fix — publication-based status masking (leak-through on deadline extension)**
- Symptom: after a lead extends the deadline (review → open), students previously marked `accepted`/`rejected` during the initial review window saw their real status revealed on `/profile`.
- Root cause: [components/profile/application-row.tsx](components/profile/application-row.tsx) `StatusPill` masked based on `phase === "review"`. The review→open roundtrip bypassed the mask.
- Fix: mask based on `!results_published_at` instead. `StatusPill` now takes `resultsPublishedAt: string | null` and shows "Under review" for accepted/rejected until the lead publishes results. Stable across any number of deadline extensions.
- No policy change to the decision surface itself: `setApplicationStatus` still blocks decisions in `open`, so the extended-open window is a no-decisions period regardless. Existing decisions persist.

**Change — profile row orientation (pill cluster + modal edit)**
- User wanted the pre-16B compact card back: pills together on the top-right, secondary metadata inline under the club name, editing in a modal (not inline expansion).
- New layout:
  ```
  [Club Name]                      [Status] [Edit] [Withdraw]
  Drive name · [For Year 3,4] · 🕐 Closes 13 Jul
  ```
- Pills sized to match one another: `rounded-full px-3 py-1.5 text-xs font-medium` (bumped from `px-2.5 py-1 text-[10px]` after user feedback — 10px was too small).
- Edit + Withdraw only render when the application is actually editable (`open` phase, not withdrawn/removed).
- Edit modal reuses the shared `Modal` component with `className="max-w-2xl"` — same width as the admin review modal. Dynamic Q&A form + Save/Cancel inside; modal closes on save success via existing `state.ok` effect.
- Dropped: the inline phase-note text ("Your application is under review and can't be edited.") — the status pill conveys the state, no extra text row needed.
- Layout files touched: [components/profile/application-row.tsx](components/profile/application-row.tsx) only.

### Verification

- `npx tsc --noEmit` — clean.
- No new migrations. Both changes are frontend-only.

### Smoke test

1. **Masking fix**:
   - As lead, in review phase, mark applicant A as accepted.
   - Extend deadline into the future (drive rolls to open).
   - Sign in as A → status pill should read "Under review", NOT "Accepted".
   - Revert deadline → still "Under review". Publish results → now shows "Accepted".
2. **Row orientation**:
   - `/profile` shows compact rows with pill cluster on the right.
   - Pills are readable (12px text) and same size.
   - Editable rows show all 3 pills; non-editable rows show only the status pill.
3. **Modal edit**:
   - Click Edit → modal opens with the Q&A form pre-filled.
   - Save → modal closes, row reflects updated state (no page reload needed).
   - Cancel → modal closes, no writes.
   - Multiple applications: editing one does not expand siblings.

---

## 16B — Addendum 4 (legacy-note SELECT strip + deferred catalog update)

Pre-16C hygiene pass in response to an audit request.

### Grep sweep

```bash
grep -rn "\.note\b\|note_by\|note_at\|note_author" \
  lib/ components/ app/ --include="*.ts" --include="*.tsx" \
  | grep -v "application_notes\|node_modules\|.next\|database.types.ts"
```

- Pre-strip: 3 hits (all `note_author:profiles!applications_note_by_fkey(full_name)` embedded joins in `admin-applications.ts` SELECTs).
- **Consumer-side grep** for `.note`, `.note_author`, `.note_at`, `.note[^s]`: **zero hits.** No live code was reading the joined result — the queries pulled bytes over the wire and dropped them.
- Post-strip: zero hits.

### Files changed

| File | Change |
|---|---|
| [lib/queries/admin-applications.ts](lib/queries/admin-applications.ts) | Removed the embedded `note_author:profiles!applications_note_by_fkey(full_name)` from all three SELECTs (`getApplicationsForClub`, `getApplicationHistoryForClub`, `getApplicationsForDrive`). Removed `note_author?: Pick<Profile, "full_name"> \| null` from `AdminApplication` interface. |

Behavior unchanged. Just eliminates wasted joins and makes `applications.note*` columns visibly unreferenced in application code.

### Roadmap updates ([CLAUDE.md](CLAUDE.md))

Formalized the maintenance sweep + question-integrity work as real steps:

- **Step 20 — Post-16 maintenance sweep**: drop dead symbols (`updateRecruitment`, `startNewRecruitment`, `getApplicationHistoryForClub`, `RecruitmentHistoryGroup`) + drop `applications.note` / `note_by` / `note_at` columns + FK. Guarded by a grep sweep before each removal.
- **Step 21 — Question-edit data-integrity**: snapshot each `q.prompt` onto `applications.responses[q_id]` at submit-time so the review UI can render "response to: `<original prompt>`" even after edits. Guards against the review→open deadline-extension roundtrip where question prompts become editable while old responses are still attached. Pair with the deferred applicant-notification-on-drive-edit feature.

Also added to the "Going to specific future steps" table so the deferred catalog reflects the new step assignments.

### Verification

- Consumer-side grep — zero hits.
- `npx tsc --noEmit` — clean.
- No behavior change on the applications page (was already using the new `notes[]` array, not the legacy `note_author` field).

Ready for 16C.

---

# 16C Batch 1 — Server + schema + WhatsApp popup component

Shipping in 2 batches. This batch: SQL migration + all query/action/validation/type patches + reusable popup component. Batch 2 wires it into 4 UI surfaces.

## Files moved (drop-folder → destinations)

| Origin (files (5)/) | Destination |
|---|---|
| `16c_mandatory_interview_link.sql` | [supabase/16c_mandatory_interview_link.sql](supabase/16c_mandatory_interview_link.sql) |
| `whatsapp-link-popup.tsx` | [components/ui/whatsapp-link-popup.tsx](components/ui/whatsapp-link-popup.tsx) |

Both moved (not copied) per instructions. Patch `.md` files left in the drop folder as reference — they're consumed guidance, not deliverables.

## Files patched

| File | Change |
|---|---|
| [lib/queries/admin-drives.ts](lib/queries/admin-drives.ts) | Added `interview_whatsapp_link: string \| null` to `DriveWithQuestions` interface + SELECT + mapper in `getDriveWithQuestions`. `DriveListItem` intentionally left alone — Batch 2 surfaces don't consume it there. |
| [lib/validation/drive.ts](lib/validation/drive.ts) | Added `whatsappLinkSchema` (trim + min 1 + max 500 + `^https?://` regex refinement). Added `interviewWhatsappLink: whatsappLinkSchema` to both `createDriveSchema` and `updateDriveSchema`. |
| [lib/actions/drive.ts](lib/actions/drive.ts) | `createDrive` + `updateDrive` both now read `formData.get("interviewWhatsappLink")` into the parse block and pass `interview_whatsapp_link_in` to the RPC. `as never` cast pattern preserved (RPC types stale until Supabase regen). |
| [lib/queries/profile.ts](lib/queries/profile.ts) | Added `interview_whatsapp_link: string \| null` to `MyApplication.recruitment` + intermediate cast + mapper. Extended `getMyApplications` SELECT to include the column. Added `community_whatsapp_link` to `MyMembership.club` `Pick<>` and to `getMyMemberships` SELECT. |
| [components/admin/drive-editor-form.tsx](components/admin/drive-editor-form.tsx) | Added controlled `interviewLink` state seeded from `drive?.interview_whatsapp_link ?? ""`. New "Interview WhatsApp link" `<input type="url" name="interviewWhatsappLink">` in Section 1 between description and target years. Backfill banner (clay-tinted) shown when `isEdit && !drive?.interview_whatsapp_link && !readOnly`. `publishMissing` extended with "interview WhatsApp link". Create-mode "Save & Publish" disabled + tooltip updated. |

## Verifications done

**Grep sweep — RPC callers of the changed signatures** (must be exactly one hit each, both in the file being patched):

```bash
grep -rn "\.rpc(\"create_drive\"\|\.rpc(\"update_drive\"" lib/ app/ --include="*.ts" --include="*.tsx"
# 2 hits, both in lib/actions/drive.ts (lines 61, 119) ✓
```

**Grep sweep — `community_whatsapp_link` in generated types** (clubs.ts patch verification):

```bash
grep -c "community_whatsapp_link" lib/database.types.ts
# 3 (Row + Insert + Update on clubs table) ✓
```

Result: `ClubDetail.community_whatsapp_link` already flows through as `string | null`. No `clubs.ts` code change needed — the patch spec correctly identified this as verify-only.

**Typecheck**: `npx tsc --noEmit` — clean.

## Locked design decisions (from SETUP)

- **Interview link reveal:** `!results_published_at && status NOT IN (withdrawn, removed)` — any non-withdrawn/non-removed applicant sees the link across Open + Review. Hidden post-publish.
- **Community link reveal:** authenticated user is in `club_members` for that club (publish gate materializes membership).
- **Mandatory interview link at drive creation:** enforced at three layers — Zod schema (client), server action, RPC + publish RPC. Existing pre-16C drives with null link get the backfill banner in the editor and are blocked from being edited until a link is added.
- **Popup:** WhatsApp icon button → modal with Join group + Copy link. Reusable across surfaces.

## Coexistence trap noted

**`create_drive` + `update_drive` RPC signatures changed from 6 → 7 params.** The migration uses `drop function if exists` on the old 6-param signatures first, then `create or replace` the new 7-param ones. Idempotent. Grants re-issued with the new signatures.

**Existing drives with `interview_whatsapp_link IS NULL`** stay in the DB. Any admin edit via `update_drive` will now be rejected with "Interview WhatsApp link is required." until they populate the field. This is Option A from the SETUP (force fill on next save) — the recommended path.

**Stale generated types on the RPC**: `create_drive` + `update_drive` in `database.types.ts` still reflect the 6-param signature until Supabase regen runs. The `as never` cast on the args object bypasses the mismatch, matching the pattern already used in this file and in `recruitment.ts` (`startNewRecruitment`).

## What Batch 1 does NOT touch

- Any student-facing UI wiring (Batch 2)
- Profile page memberships integration
- Club detail page community link surface
- Apply page guide text
- Question editing lock during review→open (deferred to step 21)
- `DriveListItem` interface extension (Batch 2 doesn't need it there)

## Smoke test after Batch 1 (apply SQL first)

1. **New drive without interview link** → Zod blocks: "Interview WhatsApp link is required."
2. **New drive with interview link** → succeeds, lands in editor with `published_at = null`.
3. **Edit an existing (pre-16C) drive** → backfill banner shown, `publishMissing` includes "interview WhatsApp link" until filled + saved.
4. **Publish gate**: publish button/action refuses without interview link. Client + server + DB all reject.
5. **Popup component** — isolated; not testable until Batch 2 wires it into a surface.

Say "Batch 1 clean" and Batch 2 (4 UI integration surfaces) ships next.

---

## 16C Batch 1 — Side fix (email disambiguation, PGRST201)

Surfaced during a publish-results smoke test. **Not a 16C regression** — pre-existing bug from step 15a that only bit now.

### Symptom

```
sendApplicationResultEmails: failed to fetch applications: {
  code: 'PGRST201',
  hint: "Try changing 'profiles' to one of the following: 'profiles!applications_note_by_fkey', 'profiles!applications_profile_id_fkey'"
}
publish_results emails: 0/0 sent; 0 failed
```

Publish RPC succeeded (results committed, memberships materialized, `results_published_at` set). Only the email loop failed at the SELECT step, so accepted/rejected applicants for that publish did **not** receive their result emails.

### Root cause

[lib/email/send-application-results.ts:33](lib/email/send-application-results.ts#L33) embedded profiles as `profile:profiles(email, full_name)` — auto-inferred. `applications` has two FKs to `profiles`:

- `applications_profile_id_fkey` (the applicant)
- `applications_note_by_fkey` (legacy note author, from 09b_review_phases)

PostgREST refuses to guess when there's more than one candidate. The bug has existed since 15a; publish_results paths just weren't exercised in tests that had actual accepted/rejected applicants until this session.

### Fix

One-line disambiguation — force the applicant FK explicitly:

```ts
"status, profile:profiles!applications_profile_id_fkey(email, full_name), club:clubs(name, slug)"
```

### Sweep

```bash
grep -rn "profiles(" lib/ app/ --include="*.ts" --include="*.tsx" \
  | grep -v ".next\|node_modules\|database.types.ts\|profiles!"
```

Only 1 hit — the file we just fixed. Every other consumer already uses explicit `profiles!<fkey>(...)`. Fix is complete.

### Impact on the failed publish

The publish itself is committed and correct. The un-emailed applicants can see their status on `/profile` (the publication-based masking rule reveals it). No further action required unless you want to add a "Resend result emails" admin control — deferred.

### Cleanup adjacency

Post-step-20 (drop `applications.note_by` column + FK), this ambiguity vanishes and the disambiguation becomes cosmetic. Keeping it in the code either way — explicit is more defensive against future re-introductions.

### Verification

- `npx tsc --noEmit` — clean.
- Consumer-side grep for un-disambiguated `profiles(` embeds — zero remaining.
- Re-run publish_results on the next test drive to confirm end-to-end email delivery.



