import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Build-time Supabase client.
 *
 * Use this in places that run at build time without an HTTP request — most
 * commonly `generateStaticParams`. The normal `createClient` from
 * `supabase/server.ts` calls `cookies()`, which Next 16 forbids outside a
 * request context.
 *
 * Anonymous client (uses anon key, no session). It can only read what the
 * `anon` role's RLS policies allow — fine for public listings like slugs.
 */
export function createStaticClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
