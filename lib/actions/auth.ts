"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
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
    ...parsed.data,
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
  return { checkInbox: true, email: parsed.data.email };
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

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
    "/auth/verified",
  )}`;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
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
