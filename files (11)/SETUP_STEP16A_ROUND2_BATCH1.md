# 16A Round 2 — Batch 1: Foundation

Types + phase enum + draft-filter defensive patch across 8 files. Ships the risky foundation before UI on top.

## What's in this batch

1. `lib/phase.ts` full REPLACE — `'draft'` added everywhere
2. Six patches for `phase === "..."` consumers — each gets a draft branch
3. One combined patch document for the 8 "most-recent recruitment" query updates (adds `.not("published_at", "is", null)` filter)
4. `lib/database.types.ts` — **you regenerate** via `supabase gen types` after the migration runs

## Order of operations

1. Confirm 16A round 1 SQL migration ran cleanly (round 1 smoke test)
2. Regenerate `lib/database.types.ts` — command below
3. Replace `lib/phase.ts` with the shipped file
4. Apply the 6 consumer patches
5. Apply the draft-filter defensive patch (8 query updates in one patch doc)
6. `npm run typecheck` — should pass cleanly
7. Smoke test: dev-server up, create a test draft drive via SQL (not UI yet — UI ships in batch 2)
8. Confirm existing recruitments still show as "Open" / "Review" / etc. (draft filter didn't accidentally hide them)

## Regenerating `database.types.ts`

If you have the Supabase CLI:
```bash
supabase gen types typescript --project-id <your-project-id> > lib/database.types.ts
```

If not, manually add these to the `Database['public']['Tables']` block:

**New `drive_questions` table type:**
```ts
drive_questions: {
  Row: {
    id: string;
    recruitment_id: string;
    prompt: string;
    question_type: 'short_text' | 'long_text';
    sort_order: number;
    required: boolean;
    created_at: string;
  };
  Insert: {
    id?: string;
    recruitment_id: string;
    prompt: string;
    question_type?: 'short_text' | 'long_text';
    sort_order?: number;
    required?: boolean;
    created_at?: string;
  };
  Update: {
    id?: string;
    recruitment_id?: string;
    prompt?: string;
    question_type?: 'short_text' | 'long_text';
    sort_order?: number;
    required?: boolean;
    created_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'drive_questions_recruitment_id_fkey';
      columns: ['recruitment_id'];
      referencedRelation: 'recruitments';
      referencedColumns: ['id'];
    }
  ];
};
```

**Update the `recruitments` Row type — add three columns:**
```ts
description: string | null;
target_years: number[];
published_at: string | null;
```

(Add matching entries in Insert and Update as optional.)

## Smoke test after Batch 1

Not fully testable until UI ships in Batch 2, but two useful checks:

**A. Draft filter is working** — via SQL directly:
```sql
-- Create a test draft drive
select create_drive(
  (select id from clubs where slug = 'shaurya'),
  'Test Draft 16A Batch 1',
  'Testing draft filter',
  array[1,2],
  now() + interval '7 days',
  now() + interval '14 days'
);
```

Then visit `/admin/clubs/shaurya` → still shows the correct current published recruitment (the draft doesn't take over). Visit `/admin/clubs/shaurya/applications` → still shows the published recruitment's apps, not the draft.

**B. Phase computation is correct** — via SQL:
```sql
-- Check the draft's phase
select r.id, r.name, r.published_at, recruitment_phase(r.id) as phase
from recruitments r
where r.name = 'Test Draft 16A Batch 1';
-- Expected: phase = 'draft'
```

If A and B pass, Batch 1 foundation is solid. Delete the test draft after:
```sql
select delete_drive((select id from recruitments where name = 'Test Draft 16A Batch 1'));
```

## What's NOT in Batch 1

- Drive queries (`admin-drives.ts`) — Batch 2
- Drive validation + actions — Batch 2
- Drive editor components + pages — Batch 3
- Recruitment page rewrite — Batch 3
- Audit categorize/format — Batch 3

## After Batch 1

Say "Batch 1 clean" (types + phase + draft filter + smoke tests pass) and I ship Batch 2: drive queries, validation, actions, and audit metadata.
