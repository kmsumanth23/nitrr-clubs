import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { createClient } from "@/lib/supabase/server";

/**
 * GUARD (gate 1 of 2): admin access = "is the user in any club_admins row
 * OR is a super_admin?" No longer role-enum-based.
 * RLS is the second gate on every actual write/read.
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

  // super_admin OR any club_admins row
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-cream pt-24">
        <div className="mx-auto flex max-w-6xl gap-6 px-6 pb-20">
          <AdminSidebar isSuper={isSuper} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </>
  );
}
