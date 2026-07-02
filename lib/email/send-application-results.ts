import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { renderApplicationResultEmail } from "@/lib/email/templates/application-result";

interface SendBatchResult {
  attempted: number;
  succeeded: number;
  failed: number;
  failures: Array<{ email: string; error: string }>;
}

/** Send application result emails to all applicants of a recruitment whose
 *  status is accepted or rejected. Called after publish_recruitment_results
 *  succeeds. Does NOT throw — collects failures and returns a report.
 *
 *  Caller responsibility: log the report. DB state is already committed by
 *  the time this runs; email outcomes don't affect it. */
export async function sendApplicationResultEmails(
  recruitmentId: string,
): Promise<SendBatchResult> {
  const supabase = await createClient();
  const result: SendBatchResult = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    failures: [],
  };

  // Fetch applications + applicant profile + club info in one query
  const { data, error } = await supabase
    .from("applications")
    .select(
      "status, profile:profiles(email, full_name), club:clubs(name, slug)",
    )
    .eq("recruitment_id", recruitmentId)
    .in("status", ["accepted", "rejected"]);

  if (error) {
    console.error(
      "sendApplicationResultEmails: failed to fetch applications:",
      error,
    );
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    const email = row.profile?.email as string | undefined;
    const name = (row.profile?.full_name as string | undefined) ?? "Student";
    const clubName = row.club?.name as string | undefined;
    const clubSlug = row.club?.slug as string | undefined;
    const accepted = row.status === "accepted";

    if (!email || !clubName || !clubSlug) {
      result.failed++;
      result.failures.push({
        email: email ?? "(missing)",
        error: "Missing email / club info",
      });
      continue;
    }

    result.attempted++;

    const rendered = renderApplicationResultEmail({
      recipientName: name,
      clubName,
      clubSlug,
      accepted,
    });

    const sendRes = await sendEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (sendRes.ok) {
      result.succeeded++;
    } else {
      result.failed++;
      result.failures.push({
        email,
        error: sendRes.error ?? "unknown",
      });
      console.error(
        `sendApplicationResultEmails: failed to send to ${email}:`,
        sendRes.error,
      );
    }
  }

  return result;
}
