import { createClient } from "@/lib/supabase/supabase__server";

export const metadata = { title: "Admin — NITRR Clubs" };

/**
 * Minimal admin landing (SSR). Proves the admin guard works; the real
 * dashboard (manage club, events, gallery, review applications) is step 9.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Clubs this user administers (RLS lets admins read club_admins rows).
  const { data: myClubs } = await supabase
    .from("club_admins")
    .select("club:clubs(name, slug)")
    .eq("profile_id", user!.id);

  return (
    <section className="mx-auto max-w-4xl px-6 pb-20 pt-28">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        Admin dashboard
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Manage club content, events, gallery and applications. (Full dashboard
        arrives at step 9.)
      </p>

      <h2 className="mb-3 mt-10 text-lg font-bold text-ink">Clubs you manage</h2>
      {!myClubs || myClubs.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          You aren&apos;t assigned to any club yet. A super-admin can add you in
          the club_admins table.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {myClubs.map((row, i) => (
            <li
              key={i}
              className="rounded-2xl border border-line bg-white p-4 text-sm font-medium text-ink"
            >
              {row.club?.name ?? "Club"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
