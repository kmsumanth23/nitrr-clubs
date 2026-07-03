import Link from "next/link";
import { IconMailCheck, IconAlertTriangle } from "@tabler/icons-react";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { VerifyEmailPoller } from "@/components/auth/verify-email-poller";

export const metadata = { title: "Verify your email — NITRR Clubs" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    email?: string;
    status?: string;
  }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { email = "", status } = await searchParams;
  const isExpired = status === "expired";

  return (
    <section className="container mx-auto max-w-md px-4 py-24">
      <div className="rounded-3xl border border-line bg-white p-8 text-center">
        {isExpired ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-clay/10 text-clay">
              <IconAlertTriangle size={22} />
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              Link expired or invalid
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              This verification link is no longer valid. Enter your email
              below and we&apos;ll send a new one.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo/10 text-indigo">
              <IconMailCheck size={22} />
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              Check your inbox
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              We&apos;ve sent a verification link to
            </p>
            {email && (
              <p className="mt-1 font-mono text-sm text-ink">
                {email}
              </p>
            )}
            <p className="mt-3 text-xs text-ink-soft">
              Click the link in that email to complete your registration.
              The link expires in one hour.
            </p>
            <VerifyEmailPoller />
          </>
        )}

        <div className="mt-6 border-t border-line pt-6">
          <VerifyEmailForm defaultEmail={email} />
        </div>

        <div className="mt-6 text-xs text-ink-soft">
          Already verified?{" "}
          <Link href="/?signin=1" className="text-indigo hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
