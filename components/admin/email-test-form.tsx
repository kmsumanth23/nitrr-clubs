"use client";

import * as React from "react";
import { useActionState } from "react";
import { IconSend, IconCheck } from "@tabler/icons-react";
import { sendTestEmail } from "@/lib/actions/email-test";

interface State {
  ok: boolean;
  error?: string;
  emailId?: string;
}

const INITIAL: State = { ok: false };

export function EmailTestForm({
  defaultTo,
}: {
  defaultTo: string;
}) {
  const [state, formAction, pending] = useActionState(sendTestEmail, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-soft">
          To
        </label>
        <input
          type="email"
          name="to"
          required
          defaultValue={defaultTo}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-indigo"
        />
        <p className="mt-1 text-[11px] text-ink-soft">
          If using Resend test mode (
          <code className="font-mono">onboarding@resend.dev</code> as FROM),
          this must be your Resend account email — sends to others will be rejected.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-soft">
          Result type
        </label>
        <select
          name="type"
          required
          defaultValue="accepted"
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-indigo"
        >
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-soft">
          Club name
        </label>
        <input
          type="text"
          name="club_name"
          required
          defaultValue="Shaurya"
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-indigo"
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="inline-flex items-center gap-1.5 rounded-lg border border-indigo/30 bg-indigo/5 px-3 py-2 text-xs text-indigo">
          <IconCheck size={12} /> Sent. Resend ID: <code className="font-mono">{state.emailId}</code>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full bg-indigo px-4 py-2 text-sm text-indigo-fg hover:bg-indigo/90 disabled:opacity-50"
      >
        <IconSend size={13} /> {pending ? "Sending…" : "Send test"}
      </button>
    </form>
  );
}
