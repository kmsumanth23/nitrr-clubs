"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCsvWithHeaders } from "@/lib/csv/parse";
import {
  bulkImportRowSchema,
  normalizeRow,
  type BulkImportRow,
} from "@/lib/validation/bulk-import";

export interface BulkImportRowResult {
  row_number: number;
  name: string;
  slug: string;
  status: "success" | "failed";
  error?: string;
}

export interface BulkImportReport {
  ok: true;
  total: number;
  succeeded: number;
  failed: number;
  rows: BulkImportRowResult[];
}

export interface BulkImportError {
  ok: false;
  error: string;
}

export type BulkImportState =
  | { ok: false; error?: undefined }
  | BulkImportError
  | BulkImportReport;

const REQUIRED_HEADERS = [
  "name",
  "category_slug",
  "lead_roll_number",
];

const ALL_HEADERS = [
  "name",
  "slug",
  "category_slug",
  "lead_roll_number",
  "tagline",
  "description",
];

export async function bulkImportClubs(
  _prev: BulkImportState,
  formData: FormData,
): Promise<BulkImportState> {
  // 1) Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") {
    return { ok: false, error: "Sysadmin only." };
  }

  // 2) Read file
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file uploaded." };
  }
  if (file.size > 1024 * 1024) {
    return { ok: false, error: "File too large (max 1 MB)." };
  }

  const text = await file.text();

  // 3) Parse CSV
  let parsed;
  try {
    parsed = parseCsvWithHeaders(text);
  } catch (e) {
    return {
      ok: false,
      error: `CSV parse failed: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
  const { headers, rows } = parsed;

  if (rows.length === 0) {
    return { ok: false, error: "CSV has no data rows." };
  }
  if (rows.length > 200) {
    return { ok: false, error: "Too many rows (max 200 per import)." };
  }

  // Check required headers present
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      return {
        ok: false,
        error: `Missing required column "${required}". Expected columns: ${ALL_HEADERS.join(", ")}.`,
      };
    }
  }

  // 4) Pre-fetch lookup maps (categories + profiles by roll_number)
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug");
  const categoryMap = new Map<string, string>();
  for (const c of categories ?? []) categoryMap.set(c.slug, c.id);

  // Get all roll_numbers used in the CSV
  const rollNumbers = Array.from(
    new Set(rows.map((r) => r.lead_roll_number).filter(Boolean)),
  );
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, roll_number")
    .in("roll_number", rollNumbers);
  const profileMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.roll_number) profileMap.set(p.roll_number, p.id);
  }

  // 5) Process each row independently
  const results: BulkImportRowResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // CSV row 1 is header; data starts at row 2
    const raw = rows[i];

    // Zod validation
    const parseResult = bulkImportRowSchema.safeParse(raw);
    if (!parseResult.success) {
      results.push({
        row_number: rowNum,
        name: raw.name ?? "(unknown)",
        slug: "",
        status: "failed",
        error: parseResult.error.issues[0].message,
      });
      failed++;
      continue;
    }

    const normalized = normalizeRow(parseResult.data as BulkImportRow);

    // Lookup category
    const categoryId = categoryMap.get(normalized.category_slug);
    if (!categoryId) {
      results.push({
        row_number: rowNum,
        name: normalized.name,
        slug: normalized.slug,
        status: "failed",
        error: `Unknown category_slug "${normalized.category_slug}"`,
      });
      failed++;
      continue;
    }

    // Lookup lead by roll_number
    const leadId = profileMap.get(normalized.lead_roll_number);
    if (!leadId) {
      results.push({
        row_number: rowNum,
        name: normalized.name,
        slug: normalized.slug,
        status: "failed",
        error: `No profile found with roll_number "${normalized.lead_roll_number}". Lead must sign up first.`,
      });
      failed++;
      continue;
    }

    // Call create_club RPC. The SQL parameter is named
    // initial_lead_profile_id_in (defined in 09g_sysadmin_more.sql) -- the
    // CSV column is lead_roll_number but the RPC arg keeps the existing
    // "initial" prefix from 12b. Mismatching the name silently fails.
    const { error: createErr } = await supabase.rpc("create_club", {
      name_in: normalized.name,
      slug_in: normalized.slug,
      category_id_in: categoryId,
      initial_lead_profile_id_in: leadId,
    });

    if (createErr) {
      results.push({
        row_number: rowNum,
        name: normalized.name,
        slug: normalized.slug,
        status: "failed",
        error: createErr.message,
      });
      failed++;
      continue;
    }

    // If tagline or description provided, patch the club after creation.
    // Typed explicitly so Supabase's update() rejects unknown columns.
    if (normalized.tagline || normalized.description) {
      const patch: { tagline?: string; description?: string } = {};
      if (normalized.tagline) patch.tagline = normalized.tagline;
      if (normalized.description) patch.description = normalized.description;
      await supabase.from("clubs").update(patch).eq("slug", normalized.slug);
    }

    results.push({
      row_number: rowNum,
      name: normalized.name,
      slug: normalized.slug,
      status: "success",
    });
    succeeded++;
  }

  // 6) Revalidate
  revalidatePath("/admin");
  revalidatePath("/clubs");
  revalidatePath("/");

  return {
    ok: true,
    total: rows.length,
    succeeded,
    failed,
    rows: results,
  };
}
