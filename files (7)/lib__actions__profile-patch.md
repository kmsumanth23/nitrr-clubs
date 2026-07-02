# Patch to `lib/actions/profile.ts`

Goal: send welcome email on first-time profile completion.

Detection: read `full_name` before the update. If it was empty, this is
the first completion — send welcome. If it already had a value, this is
an edit — don't send.

## Finding the anchor

The file has `completeProfile` (aliased as `updateProfile`). Look for the
block that does `supabase.from("profiles").update(parsed.data).eq("id", user.id)`.

## The patch

### 1) Add the import

At the top of the file:

```ts
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
```

### 2) Fetch pre-update state + conditional send

Find the existing block:

```ts
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) return { error: "Please sign in." };

const { error } = await supabase
  .from("profiles")
  .update(parsed.data)
  .eq("id", user.id);
if (error) return { error: error.message };

revalidatePath("/profile");
```

Replace with:

```ts
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) return { error: "Please sign in." };

// 15b: Check if this is first-time completion (full_name was empty before)
const { data: prev } = await supabase
  .from("profiles")
  .select("full_name")
  .eq("id", user.id)
  .maybeSingle();
const isFirstTimeCompletion = !prev?.full_name || prev.full_name.trim() === "";

const { error } = await supabase
  .from("profiles")
  .update(parsed.data)
  .eq("id", user.id);
if (error) return { error: error.message };

// 15b: On first-time completion, send welcome email (fire-and-forget)
if (isFirstTimeCompletion && user.email) {
  try {
    const emailRes = await sendWelcomeEmail({
      recipientEmail: user.email,
      recipientName: parsed.data.full_name,
    });
    if (!emailRes.ok) {
      console.error("completeProfile: welcome email failed:", emailRes.error);
    }
  } catch (e) {
    console.error("completeProfile: welcome email threw:", e);
  }
}

revalidatePath("/profile");
```

Key: the send is inside `if (isFirstTimeCompletion && user.email)`. Subsequent
edits (where `full_name` was already set) skip the send.

## Verify

```bash
npm run typecheck
```

Test flow:
- Sign up with a fresh email
- Verify (Supabase sends the confirmation link)
- Land on `/profile/complete`, fill in fields, submit
- Receive welcome email
- Go back to `/profile`, edit any field, save
- Do NOT receive a second welcome email (first-time detection works)
