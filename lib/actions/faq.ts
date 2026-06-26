"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { faqSchema } from "@/lib/validation/faq";
import { getNeighborFaq } from "@/lib/queries/faqs-admin";

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

export async function createFaq(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const parsed = faqSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Place new FAQ at the end (max sort_order + 10)
  const { data: maxRow } = await supabase
    .from("faqs")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (maxRow?.sort_order ?? 0) + 10;

  const { error } = await supabase.from("faqs").insert({
    question: parsed.data.question,
    answer: parsed.data.answer,
    is_published: parsed.data.is_published,
    sort_order: nextSort,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sysadmin/faqs");
  revalidatePath("/"); // homepage shows FAQs
  revalidatePath("/faq");
  return { ok: true };
}

export async function updateFaq(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const parsed = faqSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("faqs")
    .update({
      question: parsed.data.question,
      answer: parsed.data.answer,
      is_published: parsed.data.is_published,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sysadmin/faqs");
  revalidatePath("/");
  revalidatePath("/faq");
  return { ok: true };
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sysadmin/faqs");
  revalidatePath("/");
  revalidatePath("/faq");
  return { ok: true };
}

export async function toggleFaqPublished(
  id: string,
  next: boolean,
): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("faqs")
    .update({ is_published: next })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sysadmin/faqs");
  revalidatePath("/");
  revalidatePath("/faq");
  return { ok: true };
}

export async function reorderFaq(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const auth = await ensureSysadmin();
  if (!auth.ok) return auth;

  const neighbor = await getNeighborFaq(id, direction);
  if (!neighbor) {
    return { ok: false, error: `Already at the ${direction === "up" ? "top" : "bottom"}.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("swap_faq_order", {
    id_a: id,
    id_b: neighbor.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/sysadmin/faqs");
  revalidatePath("/");
  revalidatePath("/faq");
  return { ok: true };
}
