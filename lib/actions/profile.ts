"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { completeProfileSchema } from "@/lib/validation/profile";

export type ProfileResult = { error?: string; ok?: boolean };

/**
 * Save the profile fields (used by /profile/complete and the dashboard edit).
 * Updates the row the signup trigger already created. RLS "profiles: update
 * own" enforces id = auth.uid().
 * If `next` is set, redirects to it (used by /profile/complete).
 * Otherwise returns ok:true so the in-page edit form can flip out of edit mode.
 */
export async function completeProfile(
  _prev: ProfileResult,
  formData: FormData,
): Promise<ProfileResult> {
  const parsed = completeProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    roll_number: formData.get("roll_number"),
    year: formData.get("year"),
    branch: formData.get("branch"),
    gender: formData.get("gender") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  // 15b: Check if this is first-time completion (full_name was empty before)
  const { data: prev } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const isFirstTimeCompletion =
    !prev?.full_name || prev.full_name.trim() === "";

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);
  if (error) {
    // 23505 = unique_violation. After 14c_unique_roll.sql, a roll_number
    // already claimed by another profile raises this. Surface a friendly
    // message instead of the raw Postgres constraint name.
    if (error.code === "23505" && error.message.includes("roll_number")) {
      return {
        error: "This roll number is already registered to another account.",
      };
    }
    return { error: error.message };
  }

  // 15b: On first-time completion, send welcome email (fire-and-forget)
  if (isFirstTimeCompletion && user.email) {
    try {
      const emailRes = await sendWelcomeEmail({
        recipientEmail: user.email,
        recipientName: parsed.data.full_name,
      });
      if (!emailRes.ok) {
        console.error("completeProfile: welcome email failed:", emailRes.error);
      }
    } catch (e) {
      console.error("completeProfile: welcome email threw:", e);
    }
  }

  revalidatePath("/profile");

  const next = formData.get("next") as string | null;
  if (next && next.startsWith("/")) redirect(next);
  return { ok: true };
}

/** Aliased export the dashboard uses (same action). */
export const updateProfile = completeProfile;
