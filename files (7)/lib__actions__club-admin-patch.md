# Patch to `lib/actions/club-admin.ts`

Goal: after `add_club_admin` RPC succeeds, fire an admin-assigned email to
the newly-assigned person.

Failures don't roll back the DB write (fire-and-forget).

## Finding the anchor

Search the file for `supabase.rpc("add_club_admin"` — that's the RPC call
you want to patch after. The action is `addClubAdmin`.

## The patch

### 1) Add the import

At the top of the file:

```ts
import { sendAdminAssignedEmail } from "@/lib/email/send-admin-assigned";
```

### 2) Insert the email send after RPC success

Find:

```ts
const { error } = await supabase.rpc("add_club_admin", {
  club_id_in: parsed.data.clubId,
  profile_id_in: parsed.data.profileId,
  tier_in: parsed.data.tier,
});
if (error) return { error: error.message };

// ... existing revalidatePath, return { ok: true }
```

Get the current user id (the actor) BEFORE the RPC call — you may already
have `auth.uid()` or `user.id` from an earlier check in the action. If not,
add:

```ts
const {
  data: { user },
} = await supabase.auth.getUser();
```

near the top of the action.

Insert this block AFTER the error check, BEFORE the revalidatePath calls:

```ts
// 15b: Send admin-assigned email (fire-and-forget)
if (user) {
  try {
    const emailRes = await sendAdminAssignedEmail({
      kind: "club_admin",
      recipientProfileId: parsed.data.profileId,
      actorProfileId: user.id,
      clubId: parsed.data.clubId,
      tier: parsed.data.tier,
    });
    if (!emailRes.ok) {
      console.error(
        "addClubAdmin: admin-assigned email failed:",
        emailRes.error,
      );
    }
  } catch (e) {
    console.error("addClubAdmin: admin-assigned email threw:", e);
  }
}

// ... existing revalidatePath calls, return { ok: true }
```

## Verify

```bash
npm run typecheck
```

Test flow:
- As Gladiator (lead of Shaurya), add Recruit as manager
- DB row inserted (visible on `/admin/clubs/shaurya/admins`)
- In Resend test mode, you receive an email "You have been assigned an admin role at Shaurya"
- If Resend fails for any reason, add still succeeds; error in terminal logs
