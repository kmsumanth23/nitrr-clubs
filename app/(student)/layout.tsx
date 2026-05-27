import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase/server";

/**
 * GUARD (gate 1 of 2): requires a logged-in user.
 *
 * Note on the sign-in return trip: individual pages that know their own URL
 * (e.g. the apply page) do their own auth check FIRST and redirect to
 * `/?signin=1&next=<their path>` so the navbar can open the modal and return
 * the user precisely. This layout is the catch-all backup: if a page didn't
 * handle it, we still bounce to the sign-in prompt.
 */
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/?signin=1");

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
