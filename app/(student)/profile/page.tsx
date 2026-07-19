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
import { MyClubsList } from "@/components/profile/my-clubs-list";

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

        {/* 17A: My clubs first (was third). 2-col card grid via MyClubsList. */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">
            My clubs
          </h2>
          <MyClubsList memberships={memberships} />
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
      </div>
    </section>
  );
}