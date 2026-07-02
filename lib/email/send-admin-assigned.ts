import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import {
  renderAdminAssignedEmail,
  type AdminAssignedParams,
} from "@/lib/email/templates/admin-assigned";

interface ClubAdminAssignedInput {
  kind: "club_admin";
  recipientProfileId: string;
  actorProfileId: string;
  clubId: string;
  tier: "lead" | "manager" | "editor";
}

interface SysadminAssignedInput {
  kind: "sysadmin";
  recipientProfileId: string;
  actorProfileId: string;
}

type SendAdminAssignedInput =
  | ClubAdminAssignedInput
  | SysadminAssignedInput;

/** Send the "you have been assigned X" email.
 *  Fetches recipient email + name, actor name, and (for club variant) club
 *  info via a single Supabase round trip. Fails soft — returns {ok:false}
 *  with error string; caller logs but doesn't fail the outer action. */
export async function sendAdminAssignedEmail(
  input: SendAdminAssignedInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch recipient
  const { data: recipient, error: recipientErr } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", input.recipientProfileId)
    .maybeSingle();
  if (recipientErr || !recipient?.email) {
    return {
      ok: false,
      error: `Could not fetch recipient profile (${input.recipientProfileId}): ${
        recipientErr?.message ?? "no email"
      }`,
    };
  }

  // Fetch actor (best-effort — email works without actor name)
  const { data: actor } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", input.actorProfileId)
    .maybeSingle();
  const actorName = actor?.full_name ?? null;

  const recipientName = recipient.full_name ?? "there";

  let templateParams: AdminAssignedParams;

  if (input.kind === "club_admin") {
    // Fetch club info
    const { data: club, error: clubErr } = await supabase
      .from("clubs")
      .select("name, slug")
      .eq("id", input.clubId)
      .maybeSingle();
    if (clubErr || !club) {
      return {
        ok: false,
        error: `Could not fetch club (${input.clubId}): ${clubErr?.message ?? "not found"}`,
      };
    }
    templateParams = {
      kind: "club_admin",
      recipientName,
      actorName,
      clubName: club.name,
      clubSlug: club.slug,
      tier: input.tier,
    };
  } else {
    templateParams = {
      kind: "sysadmin",
      recipientName,
      actorName,
    };
  }

  const rendered = renderAdminAssignedEmail(templateParams);

  const sendRes = await sendEmail({
    to: recipient.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  return sendRes;
}
