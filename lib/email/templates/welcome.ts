import { renderEmailLayout, escapeHtml, link } from "./shared";

const SITE_URL = "https://nitrr-clubs.vercel.app";

export interface WelcomeParams {
  recipientName: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderWelcomeEmail(
  params: WelcomeParams,
): RenderedEmail {
  const { recipientName } = params;
  const browseUrl = `${SITE_URL}/clubs`;

  const subject = "Welcome to NITRR Clubs";

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Hello ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 16px 0;">
      Your account at NITRR Clubs has been created. You can now browse clubs, apply to open recruitments, and follow club events.
    </p>
    <p style="margin:0 0 16px 0;">
      Start by ${link(browseUrl, "exploring the clubs")} available at NIT Raipur.
    </p>
    <p style="margin:0 0 0 0;">Regards,<br>NITRR Clubs</p>
  `;

  const bodyText = `Hello ${recipientName},

Your account at NITRR Clubs has been created. You can now browse clubs, apply to open recruitments, and follow club events.

Start by exploring the clubs available at NIT Raipur.
${browseUrl}

Regards,
NITRR Clubs`;

  const { html, text } = renderEmailLayout({
    preheader: "Welcome to NITRR Clubs. Explore clubs and apply to open recruitments.",
    bodyHtml,
    bodyText,
  });

  return { subject, html, text };
}
