"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/supabase__server";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  full_name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirm_password: z.string(),
  roll_number: z.string().min(1, "Enter your roll number"),
  branch: z.string().min(1, "Select your branch"),
  year: z.coerce.number().int().min(1).max(5),
  gender: z.string().min(1, "Select your gender"),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

export type AuthResult = { error?: string };

/** Email + password sign in. */
export async function signInWithPassword(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  redirect("/");
}

/** Full sign up: creates auth user then saves profile details. */
export async function signUp(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
    roll_number: formData.get("roll_number"),
    branch: formData.get("branch"),
    year: formData.get("year"),
    gender: formData.get("gender"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { full_name, email, password, roll_number, branch, year, gender } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (error) return { error: error.message };

  // Trigger creates the profile row; update it with the remaining fields.
  if (data.user) {
    await supabase
      .from("profiles")
      .update({ full_name, roll_number, branch, year, gender })
      .eq("id", data.user.id);
  }

  redirect("/");
}

/** Begin Google OAuth — redirects to Google. Used directly as a form action. */
export async function signInWithGoogle(_formData: FormData): Promise<void> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
  if (data.url) redirect(data.url);
}
