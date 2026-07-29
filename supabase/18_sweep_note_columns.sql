-- =========================================================================
-- Step 18 — Sweep vestigial applications.note* columns
-- =========================================================================
-- Post-16B addendum 1 introduced application_notes table (append-only history).
-- The single-column note approach on applications was replaced but the columns
-- remained as vestigial. This migration drops them cleanly.
--
-- Pre-flight verification (should be run first):
--   SELECT count(*) FROM applications WHERE note IS NOT NULL;
--   Expected: 0
--
-- If nonzero, backfill to application_notes first (separate migration, not
-- included here — needs deliberate data audit).
-- =========================================================================

-- ---- 1) Drop foreign key first (before column) ---------------------------

alter table applications
  drop constraint if exists applications_note_by_fkey;

-- ---- 2) Drop the three vestigial columns ---------------------------------

alter table applications
  drop column if exists note;

alter table applications
  drop column if exists note_by;

alter table applications
  drop column if exists note_at;

-- =========================================================================
-- Post-migration sanity checks (uncomment locally to verify)
-- =========================================================================
--
-- -- Verify columns are gone:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'applications' AND column_name IN ('note', 'note_by', 'note_at');
-- -- Expected: 0 rows
--
-- -- Verify FK is gone:
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'applications' AND constraint_name = 'applications_note_by_fkey';
-- -- Expected: 0 rows
--
-- -- Application flow smoke test:
-- -- 1. Load /admin/clubs/<slug>/applications for any drive with applications
-- -- 2. Save a new note on an application (goes to application_notes)
-- -- 3. Verify no errors
