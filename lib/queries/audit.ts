import { createClient } from "@/lib/supabase/server";
import {
  type AuditCategory,
  actionsInCategory,
} from "@/lib/audit/categorize";

export interface AuditEntry {
  id: string;
  action: string;
  created_at: string;
  details: Record<string, unknown> | null;
  actor: { id: string; full_name: string | null } | null;
  target_club: { id: string; slug: string; name: string } | null;
  target_profile: { id: string; full_name: string | null } | null;
}

export interface AuditFilters {
  category?: AuditCategory;
  clubId?: string | null;
  cursor?: string | null; // created_at of the last seen row; pagination
  limit?: number;
}

const DEFAULT_LIMIT = 50;

/** Fetch audit_log entries with optional filters + cursor pagination.
 *  Returns up to `limit` rows (default 50); the caller decides whether
 *  there are more by comparing returned.length to limit. */
export async function getAuditLog(
  filters: AuditFilters = {},
): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const limit = filters.limit ?? DEFAULT_LIMIT;

  let q = supabase
    .from("audit_log")
    .select(
      `id, action, created_at, details,
       actor:profiles!audit_log_actor_id_fkey(id, full_name),
       target_club:clubs!audit_log_target_club_id_fkey(id, slug, name),
       target_profile:profiles!audit_log_target_profile_id_fkey(id, full_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  // Category filter
  if (filters.category && filters.category !== "all") {
    const actions = actionsInCategory(filters.category);
    if (actions.length > 0) {
      q = q.in("action", actions);
    }
  }

  // Club filter
  if (filters.clubId) {
    q = q.eq("target_club_id", filters.clubId);
  }

  // Cursor (created_at strictly less than the cursor — gives the NEXT page)
  if (filters.cursor) {
    q = q.lt("created_at", filters.cursor);
  }

  const { data, error } = await q;
  if (error) {
    // RLS may block; return empty silently. Component shows empty state.
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    action: r.action,
    created_at: r.created_at,
    details: r.details,
    actor: r.actor ?? null,
    target_club: r.target_club ?? null,
    target_profile: r.target_profile ?? null,
  }));
}
