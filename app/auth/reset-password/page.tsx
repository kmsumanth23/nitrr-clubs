import Link from "next/link";
import { IconLock, IconAlertTriangle, IconArrowLeft } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Reset password — NITRR Clubs" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ recovery?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { recovery } = await searchParams;
  const isRecovery = recovery === "1";

  // Server-side session check: recovery session OR regular session both allow reset.
  // No session means the user hit the URL directly without a valid reset link.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="container mx-auto max-w-md px-4 py-24">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
        >
          <IconArrowLeft size={14} /> Back to home
        </Link>

        <div className="rounded-3xl border border-line bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-clay/10 text-clay">
            <IconAlertTriangle size={22} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            Invalid reset link
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            This page requires a valid reset link. Please request a new one.
          </p>
          <div className="mt-6">
            <Link
              href="/auth/forgot-password"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo px-5 py-2.5 text-sm text-indigo-fg hover:bg-indigo/90"
            >
              Request reset link
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const heading = isRecovery ? "Set a new password" : "Change your password";
  const subhead = isRecovery
    ? "Enter your new password below. You'll be signed in and redirected to your profile."
    : "For security, enter your current password before choosing a new one.";
  const backHref = isRecovery ? "/" : "/profile";
  const backLabel = isRecovery ? "Back to home" : "Back to profile";

  return (
    <section className="container mx-auto max-w-md px-4 py-24">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> {backLabel}
      </Link>

      <div className="rounded-3xl border border-line bg-white p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo/10 text-indigo">
          <IconLock size={22} />
        </div>

        <h1 className="text-center font-display text-2xl font-extrabold tracking-tight text-ink">
          {heading}
        </h1>
        <p className="mt-2 text-center text-sm text-ink-soft">{subhead}</p>

        <div className="mt-6">
          <ResetPasswordForm mode={isRecovery ? "recovery" : "change"} />
        </div>
      </div>
    </section>
  );
}
