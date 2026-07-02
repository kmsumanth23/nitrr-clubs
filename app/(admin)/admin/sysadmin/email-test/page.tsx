import { redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { isSysadmin } from "@/lib/queries/sysadmin";
import { createClient } from "@/lib/supabase/server";
import { EmailTestForm } from "@/components/admin/email-test-form";

export const metadata = { title: "Email test — Sysadmin" };
export const dynamic = "force-dynamic";

export default async function SysadminEmailTestPage() {
  if (!(await isSysadmin())) redirect("/admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "(not configured)";
  const fromName = process.env.RESEND_FROM_NAME ?? "NITRR Clubs";
  const apiKeyConfigured = !!process.env.RESEND_API_KEY;

  return (
    <section className="container mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/admin/sysadmin"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
      >
        <IconArrowLeft size={14} /> Sysadmin
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Email test
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Send a real application-result email to verify Resend is working
          without needing to publish a recruitment.
        </p>
      </div>

      {/* Resend configuration status */}
      <div className="mb-6 rounded-2xl border border-line bg-white p-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">
          Configuration
        </h2>
        <dl className="space-y-1.5 text-xs">
          <div className="flex gap-2">
            <dt className="w-28 text-ink-soft">API key:</dt>
            <dd className={apiKeyConfigured ? "text-ink" : "text-clay"}>
              {apiKeyConfigured ? "Configured ✓" : "Not configured ✗"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 text-ink-soft">FROM email:</dt>
            <dd className="font-mono text-ink">{fromEmail}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 text-ink-soft">FROM name:</dt>
            <dd className="text-ink">{fromName}</dd>
          </div>
        </dl>
        {!apiKeyConfigured && (
          <p className="mt-3 text-[11px] text-clay">
            Set <code className="font-mono">RESEND_API_KEY</code>,{" "}
            <code className="font-mono">RESEND_FROM_EMAIL</code>, and{" "}
            <code className="font-mono">RESEND_FROM_NAME</code> in{" "}
            <code className="font-mono">.env.local</code> (and on Vercel for production).
            Restart dev server after changes.
          </p>
        )}
      </div>

      <EmailTestForm defaultTo={user?.email ?? ""} />
    </section>
  );
}
