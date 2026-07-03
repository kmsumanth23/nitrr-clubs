"use client";

import * as React from "react";
import { useActionState } from "react";
import { IconSend, IconCheck } from "@tabler/icons-react";
import { resendVerification, type AuthResult } from "@/lib/actions/auth";

const INITIAL: AuthResult = {};

export function VerifyEmailForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState(
    resendVerification,
    INITIAL,
  );

  return (
    <form action={formAction} className="space-y-3 text-left">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-soft">
          Email
        </label>
        <input
          type="email"
          name="email"
          required
          defaultValue={defaultEmail}
          placeholder="you@example.com"
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
          <IconCheck size={12} /> Verification email resent. Check your inbox.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-indigo px-4 py-2 text-sm text-indigo-fg hover:bg-indigo/90 disabled:opacity-50"
      >
        <IconSend size={13} />{" "}
        {pending ? "Sending…" : "Resend verification email"}
      </button>
    </form>
  );
}
