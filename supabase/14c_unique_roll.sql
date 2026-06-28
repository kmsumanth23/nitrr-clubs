-- =============================================================================
-- 14c_unique_roll.sql
-- Enforce uniqueness of roll_number across profiles.
--
-- IMPORTANT: Before running this, check for existing duplicates:
--
--   select roll_number, count(*) as duplicate_count
--   from profiles
--   where roll_number is not null
--   group by roll_number
--   having count(*) > 1;
--
-- If duplicates exist, null them out before running this migration
-- (UPDATE profiles SET roll_number = NULL WHERE id = '<uuid>') — otherwise
-- the constraint addition will fail.
--
-- NULL roll_numbers are allowed (Postgres default behavior for UNIQUE);
-- multiple profiles can have NULL.
-- =============================================================================

alter table profiles
  add constraint profiles_roll_number_unique unique (roll_number);

comment on constraint profiles_roll_number_unique on profiles is
  'Roll numbers are NITRR student IDs — globally unique. NULL allowed for profiles that have not set one yet.';
