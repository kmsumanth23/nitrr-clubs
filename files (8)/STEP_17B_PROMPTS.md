# Step 17B — Claude Code /goal prompts

Two focused prompts. Batch 1 first, verify clean, then Batch 2. Full context lives in `STEP_17B_SPEC.md` — pass the spec file to Claude Code as reference material.

---

## Prompt for Batch 1 (server layer)

```
/goal Implement step 17B Batch 1 — server layer for role tags on drives and members.

Read STEP_17B_SPEC.md and CLAUDE.md for full context. Follow the codebase conventions strictly (documented in the spec's "Follow the codebase conventions" section).

Scope for Batch 1:
1. Create supabase/17b_role_tags.sql with schema additions + updated create_drive + updated update_drive + updated publish_recruitment_results + three new RPCs (update_member_role, toggle_member_exclude_from_promote, bulk_promote_members). Full SQL is in STEP_17B_SPEC.md under section "supabase/17b_role_tags.sql — full contents"
2. Create lib/roles.ts (full content in spec)
3. Create lib/validation/member.ts (full content in spec)
4. Create lib/actions/member.ts (full content in spec)
5. Patch lib/queries/admin-drives.ts — extend DriveListItem + DriveWithQuestions with role_on_accept + role_label; update SELECTs and mappers in listDrivesForClub and getDriveWithQuestions
6. Patch lib/queries/apply.ts — extend DriveForApply.drive with role_on_accept + role_label; update SELECT and mapper
7. Patch lib/queries/profile.ts — extend MyMembership with role, role_label, exclude_from_promote, and admin_tier (joined from club_admins); update getMyMemberships. NOTE: with source_recruitment_id now available, simplify the drive-scoped community link resolution from the 17A two-query pattern to a direct join — see spec section "Interaction with 17A drive-scoped community link"
8. Patch lib/queries/admin-members.ts — extend MembershipDetail with role columns + exclude flag + source_recruitment_id; update getMembersForClub SELECT; add new export getMembersGroupedByRole(clubId) returning grouped output with roles in order [overall_coordinator, head_coordinator, core_coordinator, coordinator, volunteer], empty roles omitted
9. Patch lib/validation/drive.ts — extend createDriveSchema + updateDriveSchema with roleOnAccept (enum, default volunteer) + roleLabel (optional string max 100)
10. Patch lib/actions/drive.ts — createDrive + updateDrive read roleOnAccept and roleLabel from formData; pass to RPCs as role_on_accept_in and role_label_in
11. Patch lib/audit/categorize.ts — add bulk_promote_members, update_member_role, toggle_member_exclude_from_promote to MEMBER_ACTIONS set
12. Patch lib/audit/format.tsx — add sentence templates for the three new member actions

Before running npm run typecheck, execute the SQL migration in Supabase. Verify all four new columns on club_members and two new columns on recruitments exist.

Verify success criteria:
- npx tsc --noEmit passes clean
- All 4 grants on new RPCs execute successfully
- Manual RPC test: select create_drive with role_on_accept works and defaults to 'volunteer' when null
- Manual RPC test: select update_member_role with invalid role errors with 22023
- No dead imports, no unused variables

Report back with:
- Any deviations from the spec and why
- Any spec ambiguities you had to resolve
- Any linter/typecheck warnings
- Migration output from Supabase

Do NOT touch UI files. Batch 2 handles UI.
```

---

## Prompt for Batch 2 (UI layer)

Only run this AFTER Batch 1 is verified clean.

```
/goal Implement step 17B Batch 2 — UI layer for role tags.

Read STEP_17B_SPEC.md and CLAUDE.md for full context. Batch 1 (server layer) is already landed and typecheck-clean — assume all query/action/type patches are in place.

Scope for Batch 2:
1. Patch components/admin/drive-editor-form.tsx — add role dropdown + custom label field + year advisory soft warning in Section 1 (below community link). Uses ROLE_ENUM, ROLE_DEFAULT_LABELS, roleYearAdvisory from lib/roles.ts. Full JSX in spec section "Drive editor form patch". CRITICAL: verify no nested forms are introduced (Lesson 7 + Lesson 23). Grep before ship: grep -B5 -A5 "<form" drive-editor-form.tsx to see the DOM structure.
2. Create components/admin/member-edit-modal.tsx — role dropdown + custom label input + exclude toggle + save button. Uses updateMemberRole action. Renders OUTSIDE any parent form context (modal is rendered top-level, not nested inside member-row's structure).
3. Patch components/admin/member-row.tsx — display role pill + "Locked" indicator (when exclude_from_promote true) + edit button that opens MemberEditModal. Modal is a top-level sibling of the row, not a child of any form.
4. Create components/admin/bulk-promote-modal.tsx — full design in spec section "Bulk promote modal". List all members grouped by current role, checkboxes default checked (except excluded), auto-map to next tier via ROLE_PROMOTION_NEXT, confirmation showing "N members will be promoted", uses bulkPromoteMembers action. In v1, no per-row role override — just auto-map.
5. Patch app/(admin)/admin/clubs/[slug]/members/page.tsx — use getMembersGroupedByRole instead of flat getMembersForClub, render sections per role, add "Promote members" button in header that opens BulkPromoteModal.
6. Patch components/profile/my-clubs-list.tsx — MembershipCard shows role pill + web-admin overlay pill when admin_tier is set. Uses displayRoleLabel from lib/roles.ts and IconShieldCheck from tabler icons. Full JSX in spec section "MyClubsList patch — web-admin overlay".

Verify success criteria:
- npx tsc --noEmit passes clean
- No hydration warnings in browser console (grep for nested <form> elements in patched files before shipping)
- Drive editor: create new drive → role dropdown shows all 5 roles, custom label optional, year advisory renders when role.advisory_year not in target_years
- Publish flow: publish a drive with role_on_accept = 'coordinator' → verify club_members row has role = 'coordinator' after publish
- Members page: grouped display renders sections per role (order: OC → HC → Core → Coord → Vol), skip empty
- Member edit: click Edit role → modal opens outside form → change role → save → row updates
- Bulk promote: click Promote members → modal shows grouped preview → confirm → all promoted (except OCs and excluded)
- Profile My Clubs: as Recruit (member of any club), see role pill. As Gladiator on Shaurya (lead), see BOTH pills: role tag + "Web lead"

Regression tests:
- Existing drive create/update/delete flows still work
- Existing remove_member still works
- Audit log page renders bulk_promote_members entries as natural sentences

Report back with:
- Any Lesson 7 or Lesson 23 near-misses (nested forms)
- Any deviations from spec and why
- Any linter/typecheck warnings
- Screenshots of key surfaces if possible: drive editor role section, members grouped display, my clubs card with dual pills

Do NOT modify:
- Public club team display (deferred to step 21)
- club_admins.admin_role structure
- club_team table
- Any 17A files unless the interaction with source_recruitment_id / community link simplification requires it (in which case verify the 17A two-query pattern in getMyMemberships is now replaced with the direct join)
```

---

## How to hand off to Claude Code

1. Give Claude Code both `STEP_17B_SPEC.md` and `CLAUDE.md` as reference files (drag them into the conversation or place them in a location it can read)
2. Run **Prompt for Batch 1** first
3. Review Claude Code's output — verify migration ran, typecheck is clean, and it reports any deviations
4. Run smoke tests manually if you want (spec has verification queries)
5. Once Batch 1 is confirmed working, run **Prompt for Batch 2**
6. Review, smoke-test, ship

## What to watch for

- **Lesson 7 regressions** (nested forms) — I've called it out explicitly in the Batch 2 prompt, but review the drive-editor-form and member-row patches specifically
- **Grants on RPCs** — the spec has all `grant execute` statements co-located with function definitions. Verify Claude Code doesn't split them out
- **Type mismatches from Supabase generated types** — expect to use `as never` casts where new RPC params aren't yet reflected in `database.types.ts`. Regenerate types after Batch 1 lands
- **Draft filter regressions** — any new query should preserve the `.not("published_at", "is", null)` pattern where applicable

## If Claude Code diverges from the spec

That's fine — the spec is a comprehensive guide but not gospel. Review divergences case by case. If Claude Code:
- Renames something for clarity → probably fine, verify with grep
- Splits a function differently → probably fine
- Skips year advisory → NOT fine, that's a hard requirement
- Uses discriminated unions instead of flat result types → NOT fine, breaks Lesson 20 discipline
- Introduces nested forms → NOT fine, Lesson 7 violation
