import { sendEmail } from "@/lib/email/client";
import { renderWelcomeEmail } from "@/lib/email/templates/welcome";

/** Send the welcome email. Called from completeProfile on first-time
 *  completion (detected by the caller). Fails soft — returns {ok:false}
 *  with error; caller logs but doesn't fail the outer action. */
export async function sendWelcomeEmail(input: {
  recipientEmail: string;
  recipientName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { recipientEmail, recipientName } = input;
  const rendered = renderWelcomeEmail({ recipientName });

  return await sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}
