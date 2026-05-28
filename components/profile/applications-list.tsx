"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { withdrawApplication } from "@/lib/actions/application";
import type { MyApplication } from "@/lib/queries/profile";
import type { ApplicationStatus } from "@/lib/database.types";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "bg-beige text-ink-soft",
  reviewing: "bg-indigo-soft text-indigo",
  accepted: "bg-sport-soft text-sport",
  rejected: "bg-clay-soft text-clay",
  withdrawn: "bg-line text-ink-soft",
};

export function ApplicationsList({ items }: { items: MyApplication[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-soft">
        You haven&apos;t applied to any clubs yet.{" "}
        <Link href="/clubs" className="font-medium text-indigo">
          Browse clubs →
        </Link>
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((app) => (
        <Row key={app.id} app={app} />
      ))}
    </ul>
  );
}

function Row({ app }: { app: MyApplication }) {
  const canWithdraw = app.status === "pending" || app.status === "reviewing";

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0">
        <Link
          href={app.club ? `/clubs/${app.club.slug}` : "#"}
          className="block truncate text-sm font-medium text-ink hover:text-indigo"
        >
          {app.club?.name ?? "Club"}
        </Link>
        <div className="mt-0.5 text-xs text-ink-soft">
          Applied {new Date(app.created_at).toLocaleDateString("en-IN")}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${STATUS_STYLES[app.status]}`}
        >
          {app.status}
        </span>
        {canWithdraw && <WithdrawButton id={app.id} />}
      </div>
    </li>
  );
}

function WithdrawButton({ id }: { id: string }) {
  const [, formAction] = useActionState(withdrawApplication, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="applicationId" value={id} />
      <WithdrawSubmit />
    </form>
  );
}

function WithdrawSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft hover:border-clay hover:text-clay disabled:opacity-60"
    >
      {pending ? "…" : "Withdraw"}
    </button>
  );
}
