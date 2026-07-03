"use client";

import * as React from "react";
import { useActionState } from "react";
import { IconSend, IconMailCheck } from "@tabler/icons-react";
import { requestPasswordReset, type AuthResult } from "@/lib/actions/auth";

const INITIAL: AuthResult = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    INITIAL,
  );

  // Success state — show "check inbox" message
  if (state.ok && state.checkInbox) {
    return (
      <div className="rounded-2xl border border-indigo/20 bg-indigo/5 p-5 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo/10 text-indigo">
          <IconMailCheck size={18} />
        </div>
        <p className="text-sm font-medium text-ink">Check your inbox</p>
        {state.email && (
          <p className="mt-1 font-mono text-xs text-ink-soft">{state.email}</p>
        )}
        <p className="mt-3 text-xs text-ink-soft">
          If an account exists for this email, we&apos;ve sent a reset link.
          The link expires in one hour.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-soft">
          Email
        </label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo"
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-indigo px-4 py-2.5 text-sm text-indigo-fg hover:bg-indigo/90 disabled:opacity-50"
      >
        <IconSend size={13} />{" "}
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
