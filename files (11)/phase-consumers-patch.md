# Phase consumers — 6 patches

After `lib/phase.ts` gets the `'draft'` variant, TypeScript will flag every place that switch/if-chains on the old `"open"|"review"|"result"` union. Six files. Each is a small addition — draft either renders a specific state or short-circuits.

Apply patches by file. Anchor each by the phase check itself.

---

## Patch 1: `app/(admin)/admin/clubs/[slug]/applications/page.tsx`

**Anchor:** find the phase banner block. Likely a `switch (phase)` or a chain like `phase === "open" ? "Applications are open" : ...`.

Add a `"draft"` case that shows: **"This drive is a draft. Publish it to start accepting applications."**

Example shape (adapt to your existing JSX pattern):

```tsx
{phase === "draft" && (
  <div className="rounded-2xl border border-line bg-beige/50 p-4">
    <p className="text-sm text-ink-soft">
      This drive is a draft. Publish it to start accepting applications.
    </p>
  </div>
)}
{phase === "open" && (/* existing block */)}
{phase === "review" && (/* existing block */)}
{phase === "result" && (/* existing block */)}
```

If applications are empty and phase is draft, the table below should also render an empty state — the existing empty state message ("No applications yet") is fine.

---

## Patch 2: `components/admin/application-review-row.tsx`

**Anchor:** find any `phase === "open"` / `"review"` / `"result"` branches for the action buttons (Accept / Reject / etc).

Add a defensive early return for draft phase — applications can't exist against drafts (the trigger blocks it), but the row should be safe:

```tsx
if (phase === "draft") {
  return null;  // applications shouldn't exist against drafts
}
```

Place this at the top of the render logic, before any accept/reject rendering.

---

## Patch 3: `components/profile/application-row.tsx`

**Anchor:** find the `phase === "open"` / `"review"` / `"result"` chain that determines what the student sees.

Add a draft branch that shouldn't practically be hit but is defensive:

```tsx
if (phase === "draft") {
  return (
    <div className="text-xs text-ink-soft">
      Drive not yet published.
    </div>
  );
}
```

Or if your existing pattern uses `displayStatus`, mirror it — the draft branch just shows an inert dash.

---

## Patch 4: `lib/actions/admin-application.ts`

**Anchor:** `setApplicationStatus` — the action that flips application status. Currently likely rejects on `phase === "result"` (and maybe `phase === "open"`). Add draft to the rejection list.

Find the block that looks like:

```ts
if (phase === "result") {
  return { error: "Results are published. Cannot change decisions." };
}
```

Add above (or combined with):

```ts
if (phase === "draft") {
  return { error: "Drive is a draft. Cannot decide applications yet." };
}
```

Same file: `publishResults` — it currently doesn't check phase because the RPC handles it. No change needed there. RPCs are the authority for publish gates.

---

## Patch 5: `components/admin/recruitment-section.tsx`

**Anchor:** any phase display or badge component in this file.

This component gets **rewritten entirely in Batch 3** (recruitment page rewrite). For Batch 1, do the minimum:

- Add a `"draft"` case anywhere the phase is displayed
- Use `phaseLabel("draft")` → "Draft"
- Use `PHASE_BADGE["draft"]` → the beige/neutral pill

Don't invest effort here — it's coming out in Batch 3.

---

## Patch 6: `lib/phase.ts` (already done in the shipped file)

Skip — `lib/phase.ts` was already fully replaced. Draft cases are in `phaseLabel`, `studentMessage`, and `PHASE_BADGE`.

---

## Verify

```bash
npm run typecheck
```

Should pass with no `Phase` union exhaustiveness errors. If TS complains about any file not in this list, that file also has a phase-consumer branch that needs a draft case — search: `grep -rn 'phase === "open"' app/ components/ lib/`.

## Anything else in Batch 1?

No — after this, the draft-filter defensive patch (next document) is the last piece of Batch 1.
