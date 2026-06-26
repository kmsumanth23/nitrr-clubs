import { createClient } from "@/lib/supabase/server";

export interface CounterDriftRow {
  club_id: string;
  slug: string;
  name: string;
  manual_count: number;
  actual_count: number;
  drift: number; // manual - actual; positive = manual is too high
}

export async function getCounterDrift(): Promise<CounterDriftRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_counter_drift");
  if (error) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    club_id: r.club_id,
    slug: r.slug,
    name: r.name,
    manual_count: r.manual_count ?? 0,
    actual_count: r.actual_count ?? 0,
    drift: r.drift ?? 0,
  }));
}
