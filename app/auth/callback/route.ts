import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabase__server";

/**
 * OAuth (and email-confirm) callback. Supabase redirects here with a `code`;
 * we exchange it for a session cookie, then send the user on. This is the URL
 * whitelisted in Google Cloud + Supabase: /auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // 15c: code exchange failed — likely expired or already used.
    // Send to verify-email with error state so they can resend.
    console.error("auth callback: code exchange failed:", error);
    return NextResponse.redirect(
      `${origin}/auth/verify-email?status=expired`,
    );
  }

  // No code parameter at all — unusual, back to home.
  return NextResponse.redirect(`${origin}/`);
}
