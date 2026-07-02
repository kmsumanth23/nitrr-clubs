/** Resend HTTP client — fetch wrapper, no SDK.
 *  https://resend.com/docs/api-reference/emails/send-email */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/** Low-level send. Returns {ok: false, error} on failure, never throws.
 *  Caller is responsible for logging. */
export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromName = process.env.RESEND_FROM_NAME ?? "NITRR Clubs";

  if (!apiKey || !fromEmail) {
    return {
      ok: false,
      error:
        "Resend env vars not configured (RESEND_API_KEY / RESEND_FROM_EMAIL).",
    };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        error: `Resend API error ${res.status}: ${errText.slice(0, 500)}`,
      };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    return {
      ok: false,
      error: `Resend fetch threw: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
}
