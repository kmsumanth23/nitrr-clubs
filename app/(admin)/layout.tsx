import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/supabase__server";

/**
 * GUARD (gate 1 of 2): requires role admin or super_admin. Reads the profile
 * row server-side. Non-admins (and logged-out users) are redirected home.
 * RLS is the second gate — even a direct DB call is scoped by policy.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  if (role !== "admin" && role !== "super_admin") redirect("/");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream">{children}</main>
    </>
  );
}
