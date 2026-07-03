import { IconCircleCheck } from "@tabler/icons-react";

export const metadata = { title: "Email verified — NITRR Clubs" };

/**
 * Landing page after a successful email verification. The user reaches this
 * by clicking the link in their inbox — usually in a NEW tab. The original
 * signup tab, still open on /auth/verify-email, is polling for the session
 * and will navigate itself to /profile/complete.
 *
 * So this page's only job is to say: "verified, go back to the other tab."
 */
export default function VerifiedPage() {
  return (
    <section className="container mx-auto max-w-md px-4 py-24">
      <div className="rounded-3xl border border-line bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sport/10 text-sport">
          <IconCircleCheck size={28} />
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          Your email is verified
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          You can close this tab. Head back to the tab where you signed up —
          we&apos;ll take you to finish setting up your profile from there.
        </p>
      </div>
    </section>
  );
}
