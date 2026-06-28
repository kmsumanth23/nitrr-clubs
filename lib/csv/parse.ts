/** Minimal CSV parser (no dependencies).
 *
 *  Handles:
 *  - Comma separator
 *  - Double-quoted fields with internal commas: `"a,b",c` → ["a,b", "c"]
 *  - Escaped quotes: `"a""b"` → `a"b`
 *  - \n and \r\n line endings
 *  - Empty trailing fields
 *
 *  Does NOT handle:
 *  - Newlines inside quoted fields (multi-line values).
 *    Sanitize input or note in docs.
 *  - Alternative separators (semicolon, tab).
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  // Normalize line endings, drop trailing empty lines
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleanText.split("\n").filter((l) => l.length > 0);

  for (const line of lines) {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else if (c === '"') {
          inQuotes = false;
          i++;
        } else {
          current += c;
          i++;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
          i++;
        } else if (c === ",") {
          fields.push(current);
          current = "";
          i++;
        } else {
          current += c;
          i++;
        }
      }
    }
    fields.push(current);
    rows.push(fields);
  }

  return rows;
}

/** Parse CSV into header-keyed records. First row is treated as headers.
 *  Returns rows as objects with string values (trimmed). */
export function parseCsvWithHeaders(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const all = parseCsv(text);
  if (all.length === 0) return { headers: [], rows: [] };

  const headers = all[0].map((h) => h.trim());
  const dataRows = all.slice(1);

  const rows = dataRows.map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });

  return { headers, rows };
}
