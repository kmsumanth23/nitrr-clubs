/** CSV value escape: wrap in quotes if it contains comma, quote, or newline.
 *  Doubles internal quotes per RFC 4180. */
export function escapeCsvValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string from a header row and data rows.
 *  Uses \r\n line endings for Excel/Google Sheets compatibility. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((r) => r.map(escapeCsvValue).join(","));
  return [headerLine, ...dataLines].join("\r\n") + "\r\n";
}

/** Anonymize an email: keep first char + domain. e.g. 'sumanth@nitrr.ac.in'
 *  → 's***@nitrr.ac.in'. */
export function anonymizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/** Anonymize a roll number: keep first 4 chars, mask the rest. e.g.
 *  '21118270' → '21118***', 'CSE23010' → 'CSE2***'. */
export function anonymizeRoll(roll: string | null | undefined): string {
  if (!roll) return "";
  if (roll.length <= 4) return "***";
  return `${roll.slice(0, 4)}***`;
}

/** Friendly date for CSV filenames. e.g. '2026-06-17'. */
export function dateForFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Build a downloadable Response for a CSV string. Sets headers for the
 *  browser to trigger a file download. */
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
