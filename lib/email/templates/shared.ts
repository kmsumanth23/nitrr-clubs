/** Shared email layout — keeps templates consistent.
 *  Plain HTML, no React Email. Inline styles only (email clients strip
 *  <style> blocks). Conservative — Outlook 2016 still has to render it. */

const SITE_URL = "https://nitrr-clubs.vercel.app";
const BRAND_COLOR = "#5B52E0"; // indigo
const TEXT_COLOR = "#1C1A17";  // ink
const MUTED_COLOR = "#6B6459"; // ink-soft
const BG_COLOR = "#F7F3EC";    // cream

export interface EmailLayoutProps {
  /** Preheader text — shows in inbox preview before the user opens. */
  preheader: string;
  /** Inner HTML for the body. */
  bodyHtml: string;
  /** Plain text version of the body for the text fallback. */
  bodyText: string;
}

/** Wrap a body in the standard NITRR Clubs email layout.
 *  Returns both an html and text version. */
export function renderEmailLayout({
  preheader,
  bodyHtml,
  bodyText,
}: EmailLayoutProps): { html: string; text: string } {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>NITRR Clubs</title>
</head>
<body style="margin:0; padding:0; background-color:${BG_COLOR}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:${TEXT_COLOR};">
  <span style="display:none; visibility:hidden; opacity:0; max-height:0; max-width:0; overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#FFFFFF; border:1px solid #E4DCCF; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding:24px 32px; border-bottom:1px solid #E4DCCF;">
              <div style="font-weight:700; font-size:18px; color:${TEXT_COLOR}; letter-spacing:-0.01em;">
                NITRR Clubs
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px; line-height:1.55; font-size:15px; color:${TEXT_COLOR};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px; border-top:1px solid #E4DCCF; background-color:#F7F3EC; font-size:12px; color:${MUTED_COLOR};">
              <div style="margin-bottom:4px;">NIT Raipur clubs and committees</div>
              <a href="${SITE_URL}" style="color:${BRAND_COLOR}; text-decoration:none;">${SITE_URL}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${bodyText}

—
NITRR Clubs
${SITE_URL}
`;

  return { html, text };
}

/** Escape HTML special characters. Use whenever inserting untrusted strings
 *  into the HTML body. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Inline link helper — consistent styling. */
export function link(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${BRAND_COLOR}; text-decoration:underline;">${escapeHtml(label)}</a>`;
}
