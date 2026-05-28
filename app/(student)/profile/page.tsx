import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { ApplicationsList } from "@/components/profile/applications-list";
import {
  getMyProfile,
  getMyApplications,
  getMyMemberships,
} from "@/lib/queries/profile";

export const metadata = { title: "Profile — NITRR Clubs" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string }>;
}) {
  const { applied } = await searchParams;

  const [profile, applications, memberships] = await Promise.all([
    getMyProfile(),
    getMyApplications(),
    getMyMemberships(),
  ]);

  // No profile shouldn't happen (the trigger creates one on signup), but if
  // somehow missing, send them through complete-profile.
  if (!profile) redirect("/profile/complete");

  // Profile completeness gate: if any required field is null, prompt completion.
  if (!profile.roll_number) redirect("/profile/complete?next=/profile");

  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 pt-28">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Your dashboard
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Edit your details, see your applications, and the clubs you&apos;ve joined.
        </p>
      </div>

      {applied === "1" && (
        <div className="mb-6 rounded-2xl border border-sport-soft bg-sport-soft px-4 py-3 text-sm text-sport">
          Application submitted. The club will review it shortly.
        </div>
      )}

      {/* PROFILE */}
      <ProfileEditForm profile={profile} />

      {/* MY CLUBS */}
      <h2 className="mb-3 mt-10 text-lg font-bold text-ink">My clubs</h2>
      {memberships.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
          You aren&apos;t a member of any club yet. Apply to a club and once you&apos;re
          accepted you&apos;ll show up here.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {memberships.map((m) => (
            <li
              key={m.club_id}
              className="rounded-2xl border border-line bg-white p-4"
            >
              <Link
                href={`/clubs/${m.club?.slug ?? ""}`}
                className="block text-sm font-medium text-ink hover:text-indigo"
              >
                {m.club?.name ?? "Club"}
              </Link>
              <div className="mt-0.5 text-xs text-ink-soft">
                Joined {new Date(m.joined_at).toLocaleDateString("en-IN")}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* APPLICATIONS */}
      <h2 className="mb-3 mt-10 text-lg font-bold text-ink">My applications</h2>
      <ApplicationsList items={applications} />
    </section>
  );
}
