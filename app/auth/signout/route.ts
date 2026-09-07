import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/supabase__server";

/**
 * Signs the user out. POST only (was GET pre-19; changed for CSRF hardening).
 *
 * Origin header check: rejects requests whose Origin doesn't match the
 * request Host. Same-origin form submissions include Origin as of the
 * modern browser spec. Attacker-embedded cross-origin form submissions
 * would send a different Origin, blocking the CSRF.
 *
 * Fallback: if Origin is missing (very old clients, curl), fall back to
 * Referer check. If both are missing, reject.
 *
 * Linked from the navbar via <SignoutButton> component (confirmation modal
 * + form POST). No plain <a href> — GET is no longer supported.
 */
export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const requestHost = requestUrl.host;

  // CSRF check via Origin header
  const headerList = await headers();
  const originHeader = headerList.get("origin");
  const refererHeader = headerList.get("referer");

  let sameOrigin = false;
  if (originHeader) {
    try {
      sameOrigin = new URL(originHeader).host === requestHost;
    } catch {
      sameOrigin = false;
    }
  } else if (refererHeader) {
    try {
      sameOrigin = new URL(refererHeader).host === requestHost;
    } catch {
      sameOrigin = false;
    }
  }

  if (!sameOrigin) {
    console.error("signout: cross-origin request blocked", {
      originHeader,
      refererHeader,
      requestHost,
    });
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(`${requestUrl.origin}/`, {
    status: 303, // See Other — proper redirect status for POST result
  });
}
