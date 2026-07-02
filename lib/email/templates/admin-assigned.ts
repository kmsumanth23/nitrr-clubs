import { renderEmailLayout, escapeHtml, link } from "./shared";

const SITE_URL = "https://nitrr-clubs.vercel.app";

interface AdminAssignedBase {
  recipientName: string;
  actorName?: string | null;
}

interface ClubAdminAssignedParams extends AdminAssignedBase {
  kind: "club_admin";
  clubName: string;
  clubSlug: string;
  tier: "lead" | "manager" | "editor";
}

interface SysadminAssignedParams extends AdminAssignedBase {
  kind: "sysadmin";
}

export type AdminAssignedParams =
  | ClubAdminAssignedParams
  | SysadminAssignedParams;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const TIER_LABEL: Record<
  ClubAdminAssignedParams["tier"],
  string
> = {
  lead: "Lead",
  manager: "Manager",
  editor: "Editor",
};

export function renderAdminAssignedEmail(
  params: AdminAssignedParams,
): RenderedEmail {
  if (params.kind === "club_admin") {
    return renderClubAdminAssigned(params);
  }
  return renderSysadminAssigned(params);
}

function renderClubAdminAssigned(
  params: ClubAdminAssignedParams,
): RenderedEmail {
  const { recipientName, actorName, clubName, clubSlug, tier } = params;
  const clubAdminUrl = `${SITE_URL}/admin/clubs/${clubSlug}`;
  const tierLabel = TIER_LABEL[tier];
  const actorClause = actorName ? ` by ${actorName}` : "";

  const subject = `You have been assigned an admin role at ${clubName}`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Hello ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 16px 0;">
      You have been assigned as a <strong>${escapeHtml(tierLabel)}</strong> of <strong>${escapeHtml(clubName)}</strong>${escapeHtml(actorClause)}.
    </p>
    <p style="margin:0 0 16px 0;">
      You can now manage the club via the ${link(clubAdminUrl, "admin dashboard")}.
    </p>
    <p style="margin:0 0 0 0;">Regards,<br>NITRR Clubs</p>
  `;

  const bodyText = `Hello ${recipientName},

You have been assigned as a ${tierLabel} of ${clubName}${actorClause}.

You can now manage the club via the admin dashboard.
${clubAdminUrl}

Regards,
NITRR Clubs`;

  const { html, text } = renderEmailLayout({
    preheader: `You are now a ${tierLabel} of ${clubName}.`,
    bodyHtml,
    bodyText,
  });

  return { subject, html, text };
}

function renderSysadminAssigned(
  params: SysadminAssignedParams,
): RenderedEmail {
  const { recipientName, actorName } = params;
  const sysadminUrl = `${SITE_URL}/admin/sysadmin`;
  const actorClause = actorName ? ` by ${actorName}` : "";

  const subject = "You have been granted system administrator access";

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Hello ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 16px 0;">
      You have been granted system administrator access at NITRR Clubs${escapeHtml(actorClause)}.
    </p>
    <p style="margin:0 0 16px 0;">
      This role gives you full system-wide control — including creating clubs, managing all admins, and access to sysadmin tools.
    </p>
    <p style="margin:0 0 16px 0;">
      You can access the ${link(sysadminUrl, "sysadmin dashboard")} to get started.
    </p>
    <p style="margin:0 0 0 0;">Regards,<br>NITRR Clubs</p>
  `;

  const bodyText = `Hello ${recipientName},

You have been granted system administrator access at NITRR Clubs${actorClause}.

This role gives you full system-wide control — including creating clubs, managing all admins, and access to sysadmin tools.

You can access the sysadmin dashboard to get started.
${sysadminUrl}

Regards,
NITRR Clubs`;

  const { html, text } = renderEmailLayout({
    preheader: "You now have sysadmin access at NITRR Clubs.",
    bodyHtml,
    bodyText,
  });

  return { subject, html, text };
}
