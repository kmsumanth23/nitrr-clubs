# Draft-filter defensive patch — 8 query updates

The single highest-regression-risk change in 16A. Every "most-recent recruitment" query pattern (`.order("created_at", { ascending: false }).limit(1).single()`) needs a `.not("published_at", "is", null)` filter — otherwise a newly-created draft silently displaces the actually-open recruitment.

**One commit, cleanly named:** `16A: filter drafts from most-recent-recruitment queries`

Apply all 8 patches. Each is 1-2 lines added to an existing query.

---

## Patch 1 of 8 — `lib/queries/admin.ts` → `getEditableClub`

**Anchor:** `getEditableClub` function, around the block fetching the `current_recruitment`.

Find (approximately):
```ts
const { data: rec } = await supabase
  .from("recruitments")
  .select("id, name, deadline, result_date, results_published_at")
  .eq("club_id", c.id)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

Add the filter:
```ts
const { data: rec } = await supabase
  .from("recruitments")
  .select("id, name, deadline, result_date, results_published_at")
  .eq("club_id", c.id)
  .not("published_at", "is", null)          // 16A: exclude drafts
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

---

## Patch 2 of 8 — `lib/queries/admin-applications.ts` → `getApplicationsForClub`

**Anchor:** the "get current recruitment" query at the top of the function (around line 34).

Same shape as Patch 1. Add:
```ts
.not("published_at", "is", null)
```

Just before `.order("created_at", { ascending: false })`.

---

## Patch 3 of 8 — `lib/queries/admin-applications.ts` → `getApplicationHistoryForClub`

**Anchor:** same file, different function. Around line 104. Fetches recruitments for the history/archive view.

**Judgment call here:** history should show ALL past recruitments including any old ones that were never published. Practically nothing was ever created without being published (drafts didn't exist before 16A), so filtering out drafts doesn't hide meaningful history.

Recommendation: **DO add the filter** for consistency. Historical drafts (created and then abandoned) shouldn't clutter history.

Add:
```ts
.not("published_at", "is", null)
```

---

## Patch 4 of 8 — `lib/queries/admin-applications.ts` → `getApplicationCountsForClub`

**Anchor:** around line 65. Same file. Fetches counts for the current recruitment.

Same 1-line filter add. Same location relative to `.order`.

---

## Patch 5 of 8 — `lib/queries/clubs.ts` → `getClubBySlug`

**Anchor:** the recruitments subquery inside the club fetch. Search for `"recruitments"` in this file.

If it's a `.select("*, recruitments(...)")` join pattern, filtering the join isn't a one-liner. Instead, refactor the recruitment subquery to a separate fetch OR use a Supabase filter on the joined table (which is more complex).

**Simpler approach:** if the returned `recruitments` array is being used to determine "is the club currently recruiting or what's their current recruitment?", handle the filter at the CONSUMER side. Add a `.filter((r) => r.published_at !== null)` after the query returns.

If you can point Claude Code at this file's specific shape, it'll produce the right one-line fix. For now: **flag this as the one file where the fix depends on the exact join shape** — either a Supabase filter or a JS `.filter()` on the returned array.

---

## Patch 6 of 8 — `lib/queries/home.ts` (if it references recruitments)

**Anchor:** search `recruitments` in this file. If it's fetching recent recruitments for the homepage widget:

Same 1-line filter:
```ts
.not("published_at", "is", null)
```

If the file doesn't reference recruitments at all (my audit was uncertain), skip.

---

## Patch 7 of 8 — `lib/actions/application.ts` → `submitApplication`

**Anchor:** around line 44, the "get current recruitment for the club" fetch. This is the server-side check that runs when a student submits an application.

**Critical patch.** Without it, a draft drive would be silently selected, and the trigger would then reject the insert with the draft-block error we added in the SQL. Student sees an error but wouldn't know why.

Add the same filter:
```ts
.not("published_at", "is", null)
```

Then also: if `data` is null after the query (no published recruitment exists), return a friendlier error: `{ error: "This club isn't accepting applications right now." }`.

---

## Patch 8 of 8 — `app/(student)/clubs/[slug]/apply/page.tsx`

**Anchor:** line ~45, page-level fetch of the current recruitment for the apply UI.

Same filter. If the result is null (no published drive), the page should render a "not recruiting" state (existing empty state is probably fine).

Add:
```ts
.not("published_at", "is", null)
```

Before `.order("created_at", { ascending: false })`.

---

## Also: `lib/actions/club.ts` → `updateRecruitment`

**Not on your original list of 8 but worth flagging.** The action targets "current recruitment" via the same pattern (line 126-132). Same filter should be added.

Since Round 2 Batch 3 rewrites the recruitment page (which is the primary caller), the risk here is smaller. But defensive filter is still the right call.

Add:
```ts
.not("published_at", "is", null)
```

If you count this, the patch is 9 files, not 8. Still one clean commit.

---

## Verify

```bash
npm run typecheck
```

Then smoke-test the check from `SETUP_STEP16A_ROUND2_BATCH1.md`:
1. Create a test draft drive via SQL
2. Verify all admin/student pages still show the correct pre-existing published recruitment
3. Delete the test draft

Any regression in Step 2 means one of these patches wasn't fully applied — grep for `.order("created_at", { ascending: false })` on `recruitments` to find any remaining unfiltered queries.

## After this

Batch 1 is complete. Say "Batch 1 clean" and I ship Batch 2:
- `lib/queries/admin-drives.ts` (list + get-with-questions)
- `lib/validation/drive.ts` (Zod schemas)
- `lib/actions/drive.ts` (8 server actions)
- `lib/audit/categorize.ts` patch + `lib/audit/format.tsx` patch (drive action rendering)

Batch 3 (after Batch 2 lands):
- Drive editor components (target-years-picker, question-builder, etc.)
- Drive editor pages (new + [driveId])
- Recruitment page rewrite (drive-list-row + updated page.tsx)
