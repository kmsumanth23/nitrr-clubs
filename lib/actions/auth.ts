"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeEmail,
  isAllowedEmail,
  ALLOWED_DOMAINS_HINT,
} from "@/lib/auth/policy";

const credsSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type AuthResult = {
  error?: string;
  /** Set when signUp succeeded but session is pending email verification. */
  checkInbox?: boolean;
  /** Email address for the "check your inbox" message. */
  email?: string;
  /** Generic ok flag used by resendVerification. */
  ok?: boolean;
};

/** Safe internal redirect target (must be a same-site path). */
function safeNext(formData: FormData): string {
  const next = (formData.get("next") as string) || "/";
  return next.startsWith("/") ? next : "/";
}

/** Email + password sign in. */
export async function signInWithPassword(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // 15e: Normalize before calling Supabase — matches the normalization
  // applied at signup. Without this, users who signed up with a Gmail
  // variant would be locked out of their own account.
  const normalizedEmail = normalizeEmail(parsed.data.email);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  const next = safeNext(formData);
  redirect(`/profile/complete?next=${encodeURIComponent(next)}`);
}

/** Email + password sign up. */
export async function signUp(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // 15e: Normalize the email BEFORE any Supabase interaction so
  // `sumanth+a@gmail.com` and `sumanth@gmail.com` map to one account.
  const normalizedEmail = normalizeEmail(parsed.data.email);

  // 15e: Allowlist gate — hard reject non-allowlisted domains.
  if (!isAllowedEmail(normalizedEmail)) {
    return {
      error: `That email provider isn't supported. ${ALLOWED_DOMAINS_HINT}`,
    };
  }

  const supabase = await createClient();
  const next = safeNext(formData);
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  // The URL Supabase will include in the verification email as
  // {{ .ConfirmationURL }}. After the user clicks, they land on
  // /auth/callback which exchanges the code for a session, then forwards
  // to /auth/verified — a static "close this tab and go back" page. The
  // ORIGINAL signup tab is still polling on /auth/verify-email; it will
  // detect the new session and take the user through to /profile/complete
  // itself (preserving any original ?next= via that tab's own navigation).
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
    "/auth/verified",
  )}`;

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: parsed.data.password,
    options: { emailRedirectTo },
  });
  if (error) return { error: error.message };

  // Case 1: Session was created immediately (Supabase's "Confirm email" is OFF).
  // Old behavior — redirect straight to /profile/complete.
  if (data.session) {
    redirect(`/profile/complete?next=${encodeURIComponent(next)}`);
  }

  // Case 2: Session pending email verification.
  // Return checkInbox so the modal can navigate to /auth/verify-email.
  return { checkInbox: true, email: normalizedEmail };
}

/** Begin Google OAuth — returns the URL to redirect the browser to. */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const next = (formData.get("next") as string) || "/";
  const safe = next.startsWith("/") ? next : "/";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safe)}`,
    },
  });
  if (error) return;
  if (data.url) redirect(data.url);
}

/** Resend the verification email. Called from /auth/verify-email page. */
export async function resendVerification(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = ((formData.get("email") as string) ?? "").trim();
  if (!email || !email.includes("@")) {
    return { error: "Invalid email address." };
  }

  // 15e: Normalize for consistency with signup. No allowlist gate — anyone
  // with a pending verification presumably passed the signup allowlist check.
  const normalizedEmail = normalizeEmail(email);

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
    "/auth/verified",
  )}`;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalizedEmail,
    options: { emailRedirectTo },
  });
  if (error) {
    // Surface Supabase's rate-limit + already-verified errors in plain English.
    console.error("resendVerification failed:", error);
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("for security purposes")) {
      return {
        error:
          "Please wait a minute before requesting another verification email.",
      };
    }
    if (msg.includes("already") || msg.includes("confirmed")) {
      return {
        error:
          "This email is already verified. Try signing in instead.",
      };
    }
    return { error: error.message };
  }

  return { ok: true };
}

/** Request a password reset email.
 *  Anti-enumeration: shows "check inbox" success regardless of whether
 *  the email exists in Supabase. Only surfaces rate-limit errors. */
export async function requestPasswordReset(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = ((formData.get("email") as string) ?? "").trim();

  // Validate
  const emailCheck = z.string().email().max(200).safeParse(email);
  if (!emailCheck.success) {
    return { error: "Enter a valid email address." };
  }

  // 15e: Normalize for consistency with signup. NO allowlist gate here —
  // rejecting non-allowlisted emails would leak that they're not on the list,
  // which reduces the anti-enumeration security value. Supabase silently
  // swallows unknowns; we mirror the same "check inbox" response either way.
  const normalizedEmail = normalizeEmail(email);

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  // Fixed redirect target — no user input here (security: no open redirect surface).
  // The `?recovery=1` marker tells /auth/reset-password to render in recovery
  // mode (no current-password field). Regular in-app change-password uses the
  // same page without the marker.
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
    "/auth/reset-password?recovery=1",
  )}`;

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    console.error("requestPasswordReset failed:", error);
    const msg = error.message.toLowerCase();
    // Translate rate-limit errors to plain English
    if (
      msg.includes("rate") ||
      msg.includes("for security purposes") ||
      msg.includes("too many")
    ) {
      return {
        error:
          "Please wait a minute before requesting another reset email.",
      };
    }
    // For any other error, return the anti-enumeration success shape.
    // The specific error is logged for us; the user sees "check inbox."
    return { ok: true, checkInbox: true, email: normalizedEmail };
  }

  return { ok: true, checkInbox: true, email: normalizedEmail };
}

/** Update the current user's password. Requires an active session
 *  (either a recovery session from a reset link, or a regular signed-in
 *  session for in-app password change). */
export async function updatePassword(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const password = (formData.get("password") as string) ?? "";
  const confirm = (formData.get("confirm") as string) ?? "";
  const currentPassword = (formData.get("current_password") as string) ?? "";

  // Validate — same length as signup (6 chars min).
  const check = z
    .object({
      password: z.string().min(6, "Password must be at least 6 characters"),
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, {
      message: "Passwords do not match.",
      path: ["confirm"],
    })
    .safeParse({ password, confirm });

  if (!check.success) {
    return { error: check.error.issues[0].message };
  }

  const supabase = await createClient();

  // Verify session before updating.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Session expired. Please request a new password reset link.",
    };
  }

  // In-app change (as opposed to recovery-link flow): the form sends
  // `current_password`. Supabase's `require_current_password_when_updating`
  // setting rejects updateUser({ password }) on a regular session without
  // reauthentication. We verify the current password by re-signing in the
  // user — succeeds only if they know the current one, refreshes the token,
  // and then updateUser is accepted.
  if (currentPassword) {
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    if (signInErr) {
      return { error: "Current password is incorrect." };
    }
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("updatePassword failed:", error);
    const msg = error.message.toLowerCase();
    if (msg.includes("same") || msg.includes("different")) {
      return {
        error: "New password must be different from the current one.",
      };
    }
    if (msg.includes("current password required")) {
      return {
        error:
          "Please enter your current password before setting a new one.",
      };
    }
    return { error: error.message };
  }

  // Success: hardcoded redirect to /profile — no user-controllable next
  redirect("/profile");
}
