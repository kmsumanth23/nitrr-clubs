import Link from "next/link";
import { IconLock, IconArrowLeft } from "@tabler/icons-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Forgot password — NITRR Clubs" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  return (
    <section className="container mx-auto max-w-md px-4 py-24">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Back to home
      </Link>

      <div className="rounded-3xl border border-line bg-white p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo/10 text-indigo">
          <IconLock size={22} />
        </div>

        <h1 className="text-center font-display text-2xl font-extrabold tracking-tight text-ink">
          Reset your password
        </h1>
        <p className="mt-2 text-center text-sm text-ink-soft">
          Enter the email you signed up with. We&apos;ll send you a link to
          set a new password.
        </p>

        <div className="mt-6">
          <ForgotPasswordForm />
        </div>

        <div className="mt-6 border-t border-line pt-4 text-center text-xs text-ink-soft">
          Remembered it?{" "}
          <Link href="/?signin=1" className="text-indigo hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
