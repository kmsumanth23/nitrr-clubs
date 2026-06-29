import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getMyProfile,
  getMyApplications,
  getMyMemberships,
  partitionApplications,
} from "@/lib/queries/profile";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { ApplicationsList } from "@/components/profile/applications-list";
import { DecommissionedBadge } from "@/components/ui/decommissioned-badge";

export const metadata = { title: "Profile — NITRR Clubs" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?signin=1");

  const [profile, applications, memberships] = await Promise.all([
    getMyProfile(),
    getMyApplications(),
    getMyMemberships(),
  ]);
  if (!profile) redirect("/?signin=1");

  const { active, history } = partitionApplications(applications);

  return (
    <section className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Your profile
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{profile.email}</p>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">
            Profile details
          </h2>
          <ProfileEditForm profile={profile} />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-soft">
              My applications
            </h2>
            <Link
              href="/clubs"
              className="text-xs text-ink-soft hover:text-ink hover:underline"
            >
              Browse clubs →
            </Link>
          </div>
          <ApplicationsList active={active} history={history} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">
            My clubs
          </h2>
          {memberships.length === 0 ? (
            <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
              You&apos;re not in any clubs yet. Apply to one and once results
              are published, you&apos;ll see it here.
            </p>
          ) : (
            <ul className="space-y-2">
              {memberships.map((m) => {
                const isArchived = !!m.club?.archived_at;
                return (
                  <li
                    key={m.club_id}
                    className={
                      "flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 " +
                      (isArchived ? "border-clay/30 bg-cream/40" : "border-line")
                    }
                  >
                    <div className="min-w-0 flex-1">
                      {isArchived ? (
                        <span className="block truncate text-sm font-medium text-ink-soft">
                          {m.club?.name ?? "Club"}
                        </span>
                      ) : (
                        <Link
                          href={m.club ? `/clubs/${m.club.slug}` : "#"}
                          className="block truncate text-sm font-medium text-ink hover:text-indigo"
                        >
                          {m.club?.name ?? "Club"}
                        </Link>
                      )}
                      <div className="mt-0.5 text-xs text-ink-soft">
                        {m.club?.category?.name ?? "Club"} · Joined{" "}
                        {new Date(m.joined_at).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    {isArchived && (
                      <DecommissionedBadge archivedAt={m.club?.archived_at} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}