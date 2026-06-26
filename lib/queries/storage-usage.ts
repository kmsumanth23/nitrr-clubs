import { createClient } from "@/lib/supabase/server";

export interface StorageUsageRow {
  club_slug: string;
  club_name: string | null;
  file_count: number;
  total_bytes: number;
}

export interface LargestPhotoRow {
  path: string;
  bytes: number;
  club_slug: string;
  club_name: string | null;
  uploaded_at: string;
}

export interface StorageUsageReport {
  total_bytes: number;
  total_files: number;
  per_club: StorageUsageRow[];
  largest: LargestPhotoRow[];
}

/** Fetch full storage usage report via two RPCs. */
export async function getStorageUsageReport(): Promise<StorageUsageReport> {
  const supabase = await createClient();

  const [usageRes, largestRes] = await Promise.all([
    supabase.rpc("get_storage_usage"),
    // No args — uses SQL defaults: > 500 KB threshold, cap 100 rows.
    // The field is still named `largest` for backward compat with the UI;
    // semantically it's now "photos above threshold."
    supabase.rpc("get_largest_photos"),
  ]);

  // Surface RPC errors in the server log instead of silently falling back
  // to empty rows. The page is SSR'd — these logs go to the dev terminal
  // (locally) or Vercel function logs (in prod).
  if (usageRes.error) {
    console.error("[storage-usage] get_storage_usage RPC failed:", usageRes.error);
  }
  if (largestRes.error) {
    console.error("[storage-usage] get_largest_photos RPC failed:", largestRes.error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usageRows = (usageRes.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const largestRows = (largestRes.data ?? []) as any[];

  const per_club: StorageUsageRow[] = usageRows.map((r) => ({
    club_slug: r.club_slug ?? "",
    club_name: r.club_name ?? null,
    file_count: r.file_count ?? 0,
    total_bytes: Number(r.total_bytes ?? 0),
  }));

  const largest: LargestPhotoRow[] = largestRows.map((r) => ({
    path: r.path ?? "",
    bytes: Number(r.bytes ?? 0),
    club_slug: r.club_slug ?? "",
    club_name: r.club_name ?? null,
    uploaded_at: r.uploaded_at ?? "",
  }));

  const total_bytes = per_club.reduce((s, r) => s + r.total_bytes, 0);
  const total_files = per_club.reduce((s, r) => s + r.file_count, 0);

  return { total_bytes, total_files, per_club, largest };
}
