"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation/category";
import { getNeighborCategory } from "@/lib/queries/categories-admin";

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

export async function createCategory(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: `Slug "${parsed.data.slug}" is already in use.` };
  }

  // Append to end
  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (maxRow?.sort_order ?? 0) + 10;

  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    sort_order: nextSort,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sysadmin/categories");
  revalidatePath("/");
  revalidatePath("/clubs");
  return { ok: true };
}

export async function updateCategory(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // If slug changed, check uniqueness against OTHER rows
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", parsed.data.slug)
    .neq("id", id)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: `Slug "${parsed.data.slug}" is already in use.` };
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sysadmin/categories");
  revalidatePath("/");
  revalidatePath("/clubs");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();

  // Delete guard: count active clubs using this category
  const { data: countRow } = await supabase.rpc("count_clubs_in_category", {
    category_id_in: id,
  });
  const count = (countRow as number | null) ?? 0;
  if (count > 0) {
    return {
      ok: false,
      error: `Cannot delete — ${count} active club${count === 1 ? "" : "s"} use this category. Reassign them first.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sysadmin/categories");
  revalidatePath("/");
  revalidatePath("/clubs");
  return { ok: true };
}

export async function reorderCategory(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const neighbor = await getNeighborCategory(id, direction);
  if (!neighbor) {
    return { ok: false, error: `Already at the ${direction === "up" ? "top" : "bottom"}.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("swap_category_order", {
    id_a: id,
    id_b: neighbor.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sysadmin/categories");
  revalidatePath("/");
  revalidatePath("/clubs");
  return { ok: true };
}
