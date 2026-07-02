# Step 15b — Admin role assigned email + Welcome email

Second piece of step 15. Two more transactional emails wired into existing flows.

## What ships

1. Admin role assignment email — sent when someone is added as a club admin (lead/manager/editor) OR promoted to sysadmin
2. Welcome email — sent on first-time profile completion (detected by checking if `full_name` was empty before the update)

Reuses the email client + shared layout from 15a. No new infrastructure.

## Scope trims — what's NOT in 15b

- Admin removal / demotion emails (deferred; removals are usually coordinated out-of-band)
- Sysadmin revocation email (grant is notable; revocation isn't — v1 decision)
- Welcome email re-trigger for existing users (only new signups get it; existing users who never got one won't retroactively)

## File map

| Downloaded                                        | Goes to                                                              | Action  |
|---------------------------------------------------|----------------------------------------------------------------------|---------|
| `lib__email__templates__admin-assigned.ts`        | `lib/email/templates/admin-assigned.ts`                              | new     |
| `lib__email__templates__welcome.ts`               | `lib/email/templates/welcome.ts`                                     | new     |
| `lib__email__send-admin-assigned.ts`              | `lib/email/send-admin-assigned.ts`                                   | new     |
| `lib__email__send-welcome.ts`                     | `lib/email/send-welcome.ts`                                          | new     |
| `lib__actions__club-admin-patch.md`               | Apply patch to `lib/actions/club-admin.ts`                            | PATCH   |
| `lib__actions__sysadmin-patch.md`                 | Apply patch to `lib/actions/sysadmin.ts`                              | PATCH   |
| `lib__actions__profile-patch.md`                  | Apply patch to `lib/actions/profile.ts`                               | PATCH   |

## No SQL changes

Purely application layer. Reuses existing tables.

## First-time profile completion detection

The welcome email should fire once, only on first completion (not on later profile edits). Detection:

1. Fetch current profile before update: `select full_name from profiles where id = auth.uid()`
2. If `full_name` was null/empty, this is first-time completion
3. Do the update
4. If first-time, send welcome email

Rationale:
- `full_name` is a required field on `/profile/complete` — it starts empty (signup only creates id+email row)
- Once set, it's always set (form requires it)
- No schema change needed; existing column state IS the signal

Alternative would have been a `welcomed_at` timestamp column. Adds complexity for no clear benefit — the check works.

## Admin assignment email — two variants

Same template handles both:
1. **Club admin variant** — includes club name, tier, actor name (who assigned you)
2. **Sysadmin variant** — no club, no tier, just "you have sysadmin access"

Actor name is optional — if we can't fetch it cleanly, we omit gracefully.

## Test path

### Setup
1. Drop in the 4 new email files
2. Apply the three patches per their markdown files
3. `npm run typecheck` then restart dev server

### Welcome email
4. Create a fresh test account: sign up with a new email (e.g., `test-welcome-<timestamp>@nitrr.ac.in`). Verify via link.
5. Land on `/profile/complete`. Fill in all fields. Submit.
6. You (in Resend test mode) should receive the welcome email. Subject: "Welcome to NITRR Clubs".
7. Immediately go back to `/profile`, edit any field (e.g., year), save. **You should NOT receive a second welcome email.** This confirms first-time detection works.

### Admin assignment (club admin variant)
8. As Gladiator (lead of Shaurya), go to `/admin/clubs/shaurya/admins`.
9. Add a new admin (e.g., Recruit as manager). Submit.
10. You should receive the "assigned as manager of Shaurya" email in Resend test mode. (Real recipient wouldn't receive because Resend test mode only sends to your account email.)

### Admin assignment (sysadmin variant)
11. As Gladiator, go to `/admin/sysadmin/super-admins`.
12. Grant sysadmin to a test profile. Submit.
13. You receive the "granted sysadmin" email.
14. Now REVOKE sysadmin from the same test profile. You should NOT receive an email (revocation doesn't send in v1).

### Failure path
15. Break the API key temporarily. Try any of the actions above.
16. The DB write succeeds. The email fails. Terminal logs show the error. UI succeeds regardless. Restore key after.

## What's NOT in 15b

- Email verification flow fix (15c)
- Forgot password (15d)
- Domain validation (15e)

## After 15b

15c is next — email verification flow fix + `/auth/verify-email` landing page. This closes one of the P1 items from the post-deploy audit.
