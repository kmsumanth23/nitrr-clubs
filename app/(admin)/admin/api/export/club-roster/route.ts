import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubRoster } from "@/lib/queries/export";
import {
  toCsv,
  csvResponse,
  anonymizeEmail,
  anonymizeRoll,
  dateForFilename,
} from "@/lib/csv/format";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const anonymize = req.nextUrl.searchParams.get("anonymize") === "1";
  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Resolve slug to club
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!club) return new Response("Club not found", { status: 404 });

  // Authority: sysadmin OR any admin of this club (lead/manager/editor)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isSuper = profile?.role === "super_admin";
  let allowed = isSuper;
  if (!allowed) {
    const { data: admin } = await supabase
      .from("club_admins")
      .select("admin_role")
      .eq("club_id", club.id)
      .eq("profile_id", user.id)
      .maybeSingle();
    allowed = !!admin;
  }
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const rows = await getClubRoster(club.id);

  const headers = [
    "Type",
    "Tier",
    "Full name",
    "Email",
    "Roll number",
    "Year",
    "Branch",
    "Since",
  ];
  const data = rows.map((r) => [
    r.type,
    r.tier ?? "",
    r.full_name ?? "",
    anonymize ? anonymizeEmail(r.email) : r.email,
    anonymize ? anonymizeRoll(r.roll_number) : (r.roll_number ?? ""),
    r.year ?? "",
    r.branch ?? "",
    r.since ?? "",
  ]);

  const csv = toCsv(headers, data);
  const filename = `${slug}_roster_${dateForFilename()}${anonymize ? "_anonymized" : ""}.csv`;
  return csvResponse(filename, csv);
}
