"use client";

import * as React from "react";
import { useActionState } from "react";
import { IconLock, IconEye, IconEyeOff } from "@tabler/icons-react";
import { updatePassword, type AuthResult } from "@/lib/actions/auth";

const INITIAL: AuthResult = {};

/**
 * Two modes:
 *   - "recovery" — user came from a password-reset email link. They forgot
 *     the old password so we can't ask for it.
 *   - "change"  — signed-in user changing their password from /profile.
 *     Requires the current password (verified server-side by re-signing in).
 */
export function ResetPasswordForm({
  mode,
}: {
  mode: "recovery" | "change";
}) {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    INITIAL,
  );

  const [current, setCurrent] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const needsCurrent = mode === "change";
  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 6;
  const canSubmit =
    password.length >= 6 &&
    confirm.length >= 6 &&
    password === confirm &&
    (!needsCurrent || current.length > 0);

  return (
    <form action={formAction} className="space-y-3">
      {needsCurrent && (
        <PasswordField
          name="current_password"
          label="Current password"
          value={current}
          onChange={setCurrent}
          placeholder="Your current password"
          required
          autoComplete="current-password"
        />
      )}

      <PasswordField
        name="password"
        label="New password"
        value={password}
        onChange={setPassword}
        placeholder="At least 6 characters"
        required
        minLength={6}
        autoComplete="new-password"
        hint={
          tooShort ? (
            <p className="mt-1 text-[11px] text-clay">
              Password must be at least 6 characters.
            </p>
          ) : null
        }
      />

      <PasswordField
        name="confirm"
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        placeholder="Type the same password again"
        required
        minLength={6}
        autoComplete="new-password"
        hint={
          mismatch ? (
            <p className="mt-1 text-[11px] text-clay">
              Passwords don&apos;t match.
            </p>
          ) : null
        }
      />

      {state.error && (
        <p className="rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-indigo px-4 py-2.5 text-sm text-indigo-fg hover:bg-indigo/90 disabled:opacity-50"
      >
        <IconLock size={13} />{" "}
        {pending
          ? "Setting password…"
          : needsCurrent
            ? "Change password"
            : "Set new password"}
      </button>
    </form>
  );
}

/** Password input with its own independent show/hide toggle. Each field
 *  owns its own visibility state so revealing one doesn't reveal the others. */
function PasswordField({
  name,
  label,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  minLength,
  hint,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  hint?: React.ReactNode;
}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          name={name}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5 pr-10 text-sm outline-none focus:border-indigo"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-soft hover:bg-ink/5 hover:text-ink"
        >
          {visible ? <IconEyeOff size={15} /> : <IconEye size={15} />}
        </button>
      </div>
      {hint}
    </div>
  );
}
