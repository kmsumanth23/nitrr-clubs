import { createClient } from "@/lib/supabase/supabase__server";

export const metadata = { title: "Profile — NITRR Clubs" };

/**
 * Minimal profile page (SSR). Proves the student guard works; real profile +
 * applications list gets fleshed out later. Shows the user's email and any
 * applications they've made (RLS ensures they only see their own).
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: applications } = await supabase
    .from("applications")
    .select("*, club:clubs(name, slug)")
    .order("created_at", { ascending: false });

  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 pt-28">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        Your profile
      </h1>
      <p className="mt-2 text-sm text-ink-soft">{user?.email}</p>

      <h2 className="mb-3 mt-10 text-lg font-bold text-ink">
        My applications
      </h2>
      {!applications || applications.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          You haven&apos;t applied to any clubs yet. Browse clubs and hit Apply
          to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {applications.map((app) => (
            <li
              key={app.id}
              className="flex items-center justify-between rounded-2xl border border-line bg-white p-4"
            >
              <span className="text-sm font-medium text-ink">
                {app.club?.name ?? "Club"}
              </span>
              <span className="rounded-full bg-beige px-3 py-1 text-xs text-ink-soft">
                {app.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
