"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface ActionResult {
  ok: boolean;
  error?: string;
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

/** Permanently delete an archived club.
 *
 *  Two phases:
 *    1. RPC wipes DB rows + writes audit entry (atomic)
 *    2. Storage cleanup: best-effort removal of files in club-gallery/<slug>/
 *
 *  If phase 1 fails, nothing is touched.
 *  If phase 2 fails, DB is wiped but bucket has orphan files — sysadmin
 *  can clean those up manually via storage admin UI (low priority).
 */
export async function permanentlyDeleteClub(
  clubId: string,
  slugConfirm: string,
): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();

  // Phase 1: DB wipe + audit entry (atomic, via RPC)
  const { error: rpcErr } = await supabase.rpc("delete_archived_club", {
    club_id_in: clubId,
    slug_confirm: slugConfirm,
  });
  if (rpcErr) {
    console.error("delete_archived_club failed:", rpcErr);
    return { ok: false, error: rpcErr.message };
  }

  // Phase 2: storage cleanup (best-effort)
  try {
    const { data: files, error: listErr } = await supabase.storage
      .from("club-gallery")
      .list(slugConfirm, { limit: 1000 });

    if (listErr) {
      console.error(
        `Could not list storage files for ${slugConfirm}:`,
        listErr,
      );
    } else if (files && files.length > 0) {
      const paths = files.map((f) => `${slugConfirm}/${f.name}`);
      const { error: removeErr } = await supabase.storage
        .from("club-gallery")
        .remove(paths);
      if (removeErr) {
        console.error(
          `Could not remove storage files for ${slugConfirm}:`,
          removeErr,
        );
      }
    }
  } catch (e) {
    // Don't fail the whole action on storage errors. The DB is already wiped.
    console.error("Storage cleanup threw:", e);
  }

  // Revalidate pages that show clubs
  revalidatePath("/admin/sysadmin/archived");
  revalidatePath("/admin/sysadmin");
  revalidatePath("/admin");
  revalidatePath("/clubs");
  revalidatePath("/");

  return { ok: true };
}
