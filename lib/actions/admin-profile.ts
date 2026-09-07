"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AdminProfileResult = {
  error?: string;
  ok?: boolean;
};

const setYearSchema = z.object({
  profileId: z.string().uuid(),
  year: z.coerce.number().int().min(1).max(4),
});

/**
 * 19b — Sysadmin escape hatch for year edits. Wraps `admin_set_profile_year`
 * RPC. Bypasses the year-edit rules trigger (no counter decrement, no freeze
 * check) and writes an audit_log entry.
 *
 * The RPC itself enforces the sysadmin auth gate, so this action just parses
 * the form data and forwards. Any non-sysadmin caller receives the RPC's
 * '42501: Only sysadmins can override a user's year' error which surfaces
 * on the client as a friendly message.
 */
export async function setUserYear(
  _prev: AdminProfileResult,
  formData: FormData,
): Promise<AdminProfileResult> {
  const parsed = setYearSchema.safeParse({
    profileId: formData.get("profileId"),
    year: formData.get("year"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  // 19b: `admin_set_profile_year` RPC isn't in the generated types until the
  // 19b migration is applied and `supabase gen types` is re-run. This
  // suppressor self-cleans on the next regen — TypeScript will flag the
  // ts-expect-error as unused once the RPC name is known, prompting removal.
  const { error } = await supabase.rpc("admin_set_profile_year", {
    profile_id_in: parsed.data.profileId,
    new_year_in: parsed.data.year,
  } as never);
  if (error) {
    console.error("setUserYear rpc failed:", error);
    return { error: error.message };
  }

  // Refresh the diagnostics page so the search result reflects the new year
  // + reset chances counter (unchanged, but shows the diff).
  revalidatePath("/admin/sysadmin/diagnostics");
  // Also refresh the target user's profile page if they're currently viewing.
  revalidatePath("/profile");
  return { ok: true };
}
