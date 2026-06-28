import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") {
    return new Response("Forbidden", { status: 403 });
  }

  // Headers + one example row.
  // The example uses real seed data so the user can see a working format.
  // Delete the example row before adding real data.
  const csv =
    [
      "name,slug,category_slug,lead_roll_number,tagline,description",
      'Example Club,example-club,tech-robotics,21118270,An example tagline,"This is a longer description. Single line only — no embedded newlines."',
    ].join("\r\n") + "\r\n";

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="club-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
