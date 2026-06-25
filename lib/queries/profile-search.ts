"use server";

import { createClient } from "@/lib/supabase/server";

export interface ProfileSearchResult {
  id: string;
  full_name: string | null;
  email: string;
  roll_number: string | null;
  year: number | null;
  branch: string | null;
}

/** Search profiles by name, email, or roll_number. Limited to 8 results.
 *
 *  Allowed by RLS for lead+/sysadmin (policy added in 12a migration). For
 *  any other caller, this returns an empty list silently (RLS would have
 *  let through their own profile only, but the .or() filter typically
 *  excludes that too).
 *
 *  Excludes profiles that are already admins of the given club to keep the
 *  add-admin picker cleaner. */
export async function searchProfiles(
  query: string,
  excludeClubId?: string,
): Promise<ProfileSearchResult[]> {
  // Strip characters that have meaning in PostgREST .or() filter syntax —
  // commas, parens — so an attacker can't inject extra OR clauses like
  // `,role.eq.super_admin`.
  const sanitized = query.replace(/[,()]/g, " ").trim();
  if (sanitized.length < 2) return [];

  const supabase = await createClient();

  // Authority pre-check (don't rely on RLS alone). Only sysadmins and any
  // tier of club admin may search the profiles table.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const [{ data: profile }, { data: adminRow }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("club_admins")
      .select("admin_role")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);
  const isSuper = profile?.role === "super_admin";
  const isAnyClubAdmin = !!adminRow;
  if (!isSuper && !isAnyClubAdmin) return [];

  // Build a fuzzy filter: case-insensitive match on name, email, or roll
  const like = `%${sanitized}%`;
  const request = supabase
    .from("profiles")
    .select("id, full_name, email, roll_number, year, branch")
    .or(
      `full_name.ilike.${like},email.ilike.${like},roll_number.ilike.${like}`,
    )
    .limit(8);

  const { data, error } = await request;
  if (error) {
    // Common case: caller doesn't have search RLS permission. Return empty.
    return [];
  }

  let results = (data ?? []) as ProfileSearchResult[];

  // Filter out existing admins of the club, if specified
  if (excludeClubId && results.length > 0) {
    const ids = results.map((r) => r.id);
    const { data: existing } = await supabase
      .from("club_admins")
      .select("profile_id")
      .eq("club_id", excludeClubId)
      .in("profile_id", ids);
    const existingSet = new Set(
      (existing ?? []).map((r) => r.profile_id as string),
    );
    results = results.filter((r) => !existingSet.has(r.id));
  }

  return results;
}
