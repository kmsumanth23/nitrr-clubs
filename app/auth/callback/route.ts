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
  }

  // Something went wrong — back to home.
  return NextResponse.redirect(`${origin}/`);
}
