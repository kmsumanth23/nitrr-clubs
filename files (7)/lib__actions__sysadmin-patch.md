# Patch to `lib/actions/sysadmin.ts`

Goal: after `set_super_admin` RPC succeeds AND the value was `true` (grant),
fire an admin-assigned email. Revocations don't send email in v1.

## Finding the anchor

Search for `supabase.rpc("set_super_admin"` in the file. Function is
`setSuperAdmin`.

## The patch

### 1) Add the import

At the top of the file:

```ts
import { sendAdminAssignedEmail } from "@/lib/email/send-admin-assigned";
```

### 2) Insert the email send conditionally

Find:

```ts
const { error } = await supabase.rpc("set_super_admin", {
  profile_id_in: parsed.data.profileId,
  value_in: parsed.data.value,
});
if (error) return { error: error.message };

// ... existing revalidatePath, return { ok: true }
```

If the action doesn't already fetch the current user, add near the top:

```ts
const {
  data: { user },
} = await supabase.auth.getUser();
```

Insert AFTER the error check, BEFORE the revalidatePath calls:

```ts
// 15b: Send sysadmin-assigned email on grant only (not on revoke)
if (parsed.data.value && user) {
  try {
    const emailRes = await sendAdminAssignedEmail({
      kind: "sysadmin",
      recipientProfileId: parsed.data.profileId,
      actorProfileId: user.id,
    });
    if (!emailRes.ok) {
      console.error(
        "setSuperAdmin: sysadmin-assigned email failed:",
        emailRes.error,
      );
    }
  } catch (e) {
    console.error("setSuperAdmin: sysadmin-assigned email threw:", e);
  }
}

// ... existing revalidatePath calls, return { ok: true }
```

Key detail: the email only fires when `parsed.data.value === true`. Revocations
(value=false) don't send email.

## Verify

```bash
npm run typecheck
```

Test flow:
- As Gladiator, go to /admin/sysadmin/super-admins
- Grant sysadmin to a test profile → in Resend test mode, you receive
  "You have been granted system administrator access"
- Revoke sysadmin from that profile → no email received (correct behavior)
