import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cookie-free Supabase client for build-time use (generateStaticParams, etc.).
 * Uses anon key — only suitable for public reads.
 */
export function createStaticClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
