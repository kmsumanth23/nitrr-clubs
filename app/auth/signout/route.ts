import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabase__server";

/** Signs the user out and redirects home. POST-only to prevent accidental
 *  signout from link prefetch, image preloading, or stray <a> clicks. */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
