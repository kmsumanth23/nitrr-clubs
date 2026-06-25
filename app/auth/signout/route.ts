import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/supabase__server";

/** Signs the user out and redirects home. Linked from the navbar menu. */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/`);
}
