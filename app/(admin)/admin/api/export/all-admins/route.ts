import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllAdmins } from "@/lib/queries/export";
import {
  toCsv,
  csvResponse,
  anonymizeEmail,
  anonymizeRoll,
  dateForFilename,
} from "@/lib/csv/format";

export async function GET(req: NextRequest) {
  const anonymize = req.nextUrl.searchParams.get("anonymize") === "1";

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

  const rows = await getAllAdmins();

  const headers = [
    "Club",
    "Club slug",
    "Tier",
    "Full name",
    "Email",
    "Roll number",
    "Year",
    "Branch",
  ];
  const data = rows.map((r) => [
    r.club_name,
    r.club_slug,
    r.tier,
    r.full_name ?? "",
    anonymize ? anonymizeEmail(r.email) : r.email,
    anonymize ? anonymizeRoll(r.roll_number) : (r.roll_number ?? ""),
    r.year ?? "",
    r.branch ?? "",
  ]);

  const csv = toCsv(headers, data);
  const filename = `all_admins_${dateForFilename()}${anonymize ? "_anonymized" : ""}.csv`;
  return csvResponse(filename, csv);
}
