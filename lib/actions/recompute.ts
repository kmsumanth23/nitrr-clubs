"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface ActionResult {
  ok: boolean;
  error?: string;
  /** Per-club: actual count after recompute. Bulk: number of clubs fixed. */
  count?: number;
}

async function ensureSysadmin(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") {
    return { ok: false, error: "Sysadmin only." };
  }
  return { ok: true };
}

/** Recompute one club's member_count. */
export async function recomputeOne(clubId: string): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  // recompute_member_count is defined in 14c_recompute.sql and not yet in
  // database.types.ts -- regen will pick it up. Cast bypasses the generated
  // RPC name union until then. Same pattern as start_new_recruitment, etc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("recompute_member_count", {
    club_id_in: clubId,
  });
  if (error) {
    console.error("recompute_member_count failed:", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/sysadmin/diagnostics");
  return { ok: true, count: (data as number | null) ?? 0 };
}

/** Recompute all clubs with drift. Returns count of clubs fixed. */
export async function recomputeAll(): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  // Same as above -- new RPC not yet in generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(
    "recompute_all_member_counts",
  );
  if (error) {
    console.error("recompute_all_member_counts failed:", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/sysadmin/diagnostics");
  return { ok: true, count: (data as number | null) ?? 0 };
}
