-- =========================================================================
-- Cleanup: remove all club_members (test data only)
-- =========================================================================
-- Preserves club_admins (test admin roles remain).
-- Safe to run repeatedly. No cascade to profiles or applications.
-- =========================================================================

-- Preview what will be deleted (dry run):
select
  cm.club_id,
  c.slug as club_slug,
  cm.profile_id,
  p.full_name,
  p.roll_number,
  cm.joined_at
from club_members cm
left join clubs c on c.id = cm.club_id
left join profiles p on p.id = cm.profile_id
order by cm.joined_at desc;

-- If preview looks right, run the delete:
delete from club_members;

-- Verify counts:
select count(*) as remaining_members from club_members;
-- Expected: 0

-- Confirm test admins are intact:
select
  ca.club_id,
  c.slug as club_slug,
  ca.admin_role,
  p.full_name,
  p.roll_number
from club_admins ca
left join clubs c on c.id = ca.club_id
left join profiles p on p.id = ca.profile_id
order by ca.admin_role, c.slug;
-- Expected: Gladiator, Sumanth, Maximus, Spartan all present.
