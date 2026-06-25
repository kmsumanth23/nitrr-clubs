"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { eventSchema } from "@/lib/validation/event";

export type EventResult = { error?: string; ok?: boolean };

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "") as string;
  return s.trim().length === 0 ? null : s;
}

function toIso(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "") as string;
  if (!s.trim()) return null;
  return new Date(s).toISOString();
}

async function ensureAdminOfClub(
  clubId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const [{ data: profile }, { data: adminRow }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("club_admins")
      .select("id")
      .eq("club_id", clubId)
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);
  const isSuper = profile?.role === "super_admin";
  if (!isSuper && !adminRow) {
    return { ok: false, error: "You don't have access to this club." };
  }
  return { ok: true, userId: user.id };
}

/** Create an event. Redirects to the events list on success. */
export async function createEvent(
  _prev: EventResult,
  formData: FormData,
): Promise<EventResult> {
  const club_id = formData.get("club_id") as string;
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = eventSchema.safeParse({
    club_id,
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: nullable(formData.get("description")),
    poster_url: nullable(formData.get("poster_url")),
    venue: nullable(formData.get("venue")),
    starts_at: toIso(formData.get("starts_at")),
    ends_at: toIso(formData.get("ends_at")),
    reg_open: formData.get("reg_open") === "on",
    reg_url: nullable(formData.get("reg_url")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await ensureAdminOfClub(club_id);
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .insert({ ...parsed.data, updated_by: auth.userId });
  if (error) {
    if (error.code === "23505") return { error: "That slug is already taken." };
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/clubs/${clubSlug}`);
  redirect(`/admin/clubs/${clubSlug}/events`);
}

/**
 * Update an event. Stays on the edit page; returns ok:true so the form can
 * show a "Saved" indicator (consistent with the club edit form).
 */
export async function updateEvent(
  _prev: EventResult,
  formData: FormData,
): Promise<EventResult> {
  const id = formData.get("id") as string;
  const club_id = formData.get("club_id") as string;
  const clubSlug = formData.get("__club_slug") as string;

  const parsed = eventSchema.safeParse({
    id,
    club_id,
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: nullable(formData.get("description")),
    poster_url: nullable(formData.get("poster_url")),
    venue: nullable(formData.get("venue")),
    starts_at: toIso(formData.get("starts_at")),
    ends_at: toIso(formData.get("ends_at")),
    reg_open: formData.get("reg_open") === "on",
    reg_url: nullable(formData.get("reg_url")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await ensureAdminOfClub(club_id);
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  // Strip id from the update patch (id is the row selector, not a column to update).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...patch } = parsed.data;
  const { error } = await supabase
    .from("events")
    .update({ ...patch, updated_by: auth.userId })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "That slug is already taken." };
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${parsed.data.slug}`);
  revalidatePath(`/clubs/${clubSlug}`);
  return { ok: true };
}

/** Delete an event. */
export async function deleteEvent(
  _prev: EventResult,
  formData: FormData,
): Promise<EventResult> {
  const id = formData.get("id") as string;
  const club_id = formData.get("club_id") as string;
  const clubSlug = formData.get("__club_slug") as string;
  if (!id || !club_id) return { error: "Missing fields." };

  const auth = await ensureAdminOfClub(club_id);
  if (!auth.ok) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/clubs/${clubSlug}`);
  return { ok: true };
}
