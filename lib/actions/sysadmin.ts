"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendAdminAssignedEmail } from "@/lib/email/send-admin-assigned";
import {
  setSuperAdminSchema,
  createClubSchema,
  clubIdSchema,
} from "@/lib/validation/sysadmin";

export type SysadminResult = { error?: string; ok?: boolean };

export async function setSuperAdmin(
  _prev: SysadminResult,
  formData: FormData,
): Promise<SysadminResult> {
  const parsed = setSuperAdminSchema.safeParse({
    profileId: formData.get("profileId"),
    value: formData.get("value") === "true" || formData.get("value") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.rpc("set_super_admin", {
    profile_id_in: parsed.data.profileId,
    value_in: parsed.data.value,
  });
  if (error) return { error: error.message };

  // 15b: Send sysadmin-assigned email on grant only (not on revoke)
  if (parsed.data.value && user) {
    try {
      const emailRes = await sendAdminAssignedEmail({
        kind: "sysadmin",
        recipientProfileId: parsed.data.profileId,
        actorProfileId: user.id,
      });
      if (!emailRes.ok) {
        console.error(
          "setSuperAdmin: sysadmin-assigned email failed:",
          emailRes.error,
        );
      }
    } catch (e) {
      console.error("setSuperAdmin: sysadmin-assigned email threw:", e);
    }
  }

  revalidatePath("/admin/sysadmin/super-admins");
  revalidatePath("/admin/sysadmin");
  revalidatePath("/admin");
  return { ok: true };
}

export async function createClubAction(
  _prev: SysadminResult & { newSlug?: string },
  formData: FormData,
): Promise<SysadminResult & { newSlug?: string }> {
  const parsed = createClubSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    categoryId: nullable(formData.get("categoryId")),
    initialLeadProfileId: formData.get("initialLeadProfileId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  // The generated RPC type marks `category_id_in` as non-null `string`, but
  // the SQL function accepts NULL (uncategorized clubs are valid). Cast to
  // bypass the incorrect type until types regen catches up.
  const { error } = await supabase.rpc("create_club", {
    name_in: parsed.data.name,
    slug_in: parsed.data.slug,
    category_id_in: parsed.data.categoryId ?? null,
    initial_lead_profile_id_in: parsed.data.initialLeadProfileId,
  } as never);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/sysadmin");
  revalidatePath("/clubs");
  revalidatePath("/");
  redirect(`/admin/clubs/${parsed.data.slug}`);
}

export async function decommissionClub(
  _prev: SysadminResult,
  formData: FormData,
): Promise<SysadminResult> {
  const parsed = clubIdSchema.safeParse({
    clubId: formData.get("clubId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("decommission_club", {
    club_id_in: parsed.data.clubId,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/sysadmin");
  revalidatePath("/admin/sysadmin/archived");
  revalidatePath("/clubs");
  revalidatePath("/");
  redirect("/admin");
}

export async function restoreClub(
  _prev: SysadminResult,
  formData: FormData,
): Promise<SysadminResult> {
  const parsed = clubIdSchema.safeParse({
    clubId: formData.get("clubId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_club", {
    club_id_in: parsed.data.clubId,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/sysadmin/archived");
  revalidatePath("/clubs");
  revalidatePath("/");
  return { ok: true };
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "") as string;
  return s.trim().length === 0 ? null : s;
}
