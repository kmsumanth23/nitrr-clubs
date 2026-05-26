import { createClient } from "@/lib/supabase/supabase__server";
import { CompleteProfileForm } from "@/components/profile/complete-profile-form";

export const metadata = { title: "Complete your profile — NITRR Clubs" };

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, roll_number, year, branch, gender")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <section className="mx-auto max-w-md px-6 pb-20 pt-28">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        Complete your profile
      </h1>
      <p className="mb-8 mt-2 text-sm text-ink-soft">
        We need a few details before you can apply to clubs. This is a one-time
        step.
      </p>

      <CompleteProfileForm
        defaults={{
          full_name: profile?.full_name ?? null,
          roll_number: profile?.roll_number ?? null,
          year: profile?.year ?? null,
          branch: profile?.branch ?? null,
          gender: profile?.gender ?? null,
        }}
        next={next ?? "/profile"}
      />
    </section>
  );
}
