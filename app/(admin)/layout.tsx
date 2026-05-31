import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { AdminShell } from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";
import { getMyAdminClubs } from "@/lib/queries/admin";

/**
 * GUARD (gate 1 of 2): admin access = super_admin OR any club_admins row.
 *
 * Sidebar shows only on /admin/clubs/<slug>/... — handled inside AdminShell,
 * which reads the pathname client-side. The layout fetches the user's clubs
 * once and hands them down (used for the "Switch club" picker).
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
  if (!user) redirect("/?signin=1");

  const [{ data: profile }, { count: adminCount }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("club_admins")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id),
  ]);

  const isSuper = profile?.role === "super_admin";
  const isClubAdmin = (adminCount ?? 0) > 0;
  if (!isSuper && !isClubAdmin) redirect("/");

  // Clubs the user manages — fed to the sidebar's "Switch club" picker.
  const myClubs = await getMyAdminClubs();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-cream pt-24">
        <AdminShell
          clubs={myClubs.map((c) => ({
            slug: c.slug,
            name: c.name,
            tier: c.tier,
          }))}
        >
          {children}
        </AdminShell>
      </div>
    </>
  );
}
