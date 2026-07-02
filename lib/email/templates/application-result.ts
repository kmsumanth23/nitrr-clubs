import { renderEmailLayout, escapeHtml, link } from "./shared";

const SITE_URL = "https://nitrr-clubs.vercel.app";

export interface ApplicationResultTemplateParams {
  recipientName: string;
  clubName: string;
  clubSlug: string;
  accepted: boolean;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Render the accepted/rejected application result email. */
export function renderApplicationResultEmail(
  params: ApplicationResultTemplateParams,
): RenderedEmail {
  const { recipientName, clubName, clubSlug, accepted } = params;
  const clubUrl = `${SITE_URL}/clubs/${clubSlug}`;
  const browseUrl = `${SITE_URL}/clubs`;

  const subject = `Update on your ${clubName} application`;

  if (accepted) {
    const bodyHtml = `
      <p style="margin:0 0 16px 0;">Hello ${escapeHtml(recipientName)},</p>
      <p style="margin:0 0 16px 0;">
        Your application for <strong>${escapeHtml(clubName)}</strong> has been accepted. Welcome to the club.
      </p>
      <p style="margin:0 0 16px 0;">
        The community link is now visible on the ${link(clubUrl, "club page")} after signing in.
      </p>
      <p style="margin:0 0 0 0;">Regards,<br>NITRR Clubs</p>
    `;

    const bodyText = `Hello ${recipientName},

Your application for ${clubName} has been accepted. Welcome to the club.

The community link is now visible on the club page after signing in.
${clubUrl}

Regards,
NITRR Clubs`;

    const { html, text } = renderEmailLayout({
      preheader: `Welcome to ${clubName}.`,
      bodyHtml,
      bodyText,
    });

    return { subject, html, text };
  }

  // Rejected
  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Hello ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 16px 0;">
      Thank you for applying to <strong>${escapeHtml(clubName)}</strong>. Unfortunately, your application was not accepted this time.
    </p>
    <p style="margin:0 0 16px 0;">
      Clubs often run recruitments each year — we encourage you to apply again in the next cycle. You can also ${link(browseUrl, "explore other clubs")} that may align with your interests.
    </p>
    <p style="margin:0 0 0 0;">Regards,<br>NITRR Clubs</p>
  `;

  const bodyText = `Hello ${recipientName},

Thank you for applying to ${clubName}. Unfortunately, your application was not accepted this time.

Clubs often run recruitments each year — we encourage you to apply again in the next cycle. You can also explore other clubs that may align with your interests.
${browseUrl}

Regards,
NITRR Clubs`;

  const { html, text } = renderEmailLayout({
    preheader: `Update on your ${clubName} application.`,
    bodyHtml,
    bodyText,
  });

  return { subject, html, text };
}
