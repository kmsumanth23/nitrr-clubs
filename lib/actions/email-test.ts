"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { renderApplicationResultEmail } from "@/lib/email/templates/application-result";

interface ActionResult {
  ok: boolean;
  error?: string;
  emailId?: string;
}

const INITIAL: ActionResult = { ok: false };

export async function sendTestEmail(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // Auth: sysadmin only
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") {
    return { ok: false, error: "Sysadmin only." };
  }

  const to = (formData.get("to") as string)?.trim();
  const type = formData.get("type") as string;
  const clubName = ((formData.get("club_name") as string) ?? "Test Club").trim();

  if (!to || !to.includes("@")) {
    return { ok: false, error: "Valid 'to' email required." };
  }
  if (type !== "accepted" && type !== "rejected") {
    return { ok: false, error: "Type must be 'accepted' or 'rejected'." };
  }
  if (!clubName) {
    return { ok: false, error: "Club name required." };
  }

  const recipientName =
    (profile?.full_name as string | undefined) ?? "Tester";

  const rendered = renderApplicationResultEmail({
    recipientName,
    clubName,
    clubSlug: "test-club",
    accepted: type === "accepted",
  });

  const sendRes = await sendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (!sendRes.ok) {
    return { ok: false, error: sendRes.error };
  }

  return { ok: true, emailId: sendRes.id };
}
