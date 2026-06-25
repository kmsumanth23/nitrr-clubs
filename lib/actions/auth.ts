"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credsSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type AuthResult = { error?: string };

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
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) return { error: error.message };

  const next = safeNext(formData);
  redirect(`/profile/complete?next=${encodeURIComponent(next)}`);
}

/** Sign out the current user. Server Action — cookie deletes propagate
 *  through the redirect response automatically (Route Handler equivalents
 *  drop the Set-Cookie headers on NextResponse.redirect). */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
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
