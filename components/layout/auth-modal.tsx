"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IconBrandGoogle } from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";
import {
  signInWithPassword,
  signUp,
  signInWithGoogle,
  type AuthResult,
} from "@/lib/actions/auth";

const BRANCHES = [
  "CSE", "ECE", "EE", "ME", "CE", "CH", "MME", "IT", "BT", "MNG", "ARCH", "MCA", "MBA",
];

const YEARS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
  { value: "5", label: "5th Year" },
];

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const inputCls =
  "w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-[13px] text-ink outline-none focus:border-indigo placeholder:text-ink-soft/60";
const labelCls = "mb-1 block text-[11px] font-medium text-ink-soft";

export function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const isSignup = mode === "signup";

  const action = isSignup ? signUp : signInWithPassword;
  const [state, formAction] = useActionState<AuthResult, FormData>(action, {});

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="text-center font-display text-xl font-bold text-ink">
        {isSignup ? "Create your account" : "Welcome back"}
      </h3>
      <p className="mb-5 mt-1 text-center text-xs text-ink-soft">
        {isSignup
          ? "Join to apply and follow your clubs"
          : "Sign in to apply and track your clubs"}
      </p>

      {/* Google OAuth */}
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="mb-3.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-line bg-white p-2.5 text-[13px] font-medium text-ink hover:bg-cream"
        >
          <IconBrandGoogle size={17} />
          Continue with Google
        </button>
      </form>

      <div className="mb-4 flex items-center gap-2.5 text-[11px] text-ink-soft before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        <span>or</span>
      </div>

      {/* Sign in / sign up form */}
      <form action={formAction} className="space-y-2.5">
        {isSignup && (
          <>
            <div>
              <label className={labelCls}>Full name</label>
              <input name="full_name" type="text" required placeholder="Ramesh Kumar" className={inputCls} />
            </div>
          </>
        )}

        <div>
          <label className={labelCls}>Email</label>
          <input name="email" type="email" required placeholder="you@example.com" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Password</label>
          <input name="password" type="password" required placeholder="Min. 6 characters" className={inputCls} />
        </div>

        {isSignup && (
          <>
            <div>
              <label className={labelCls}>Confirm password</label>
              <input name="confirm_password" type="password" required placeholder="Re-enter password" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelCls}>Roll number</label>
                <input name="roll_number" type="text" required placeholder="21CSE001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Year</label>
                <select name="year" required defaultValue="" className={inputCls}>
                  <option value="" disabled>Select</option>
                  {YEARS.map((y) => (
                    <option key={y.value} value={y.value}>{y.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelCls}>Branch</label>
                <select name="branch" required defaultValue="" className={inputCls}>
                  <option value="" disabled>Select</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Gender</label>
                <select name="gender" required defaultValue="" className={inputCls}>
                  <option value="" disabled>Select</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {state.error && (
          <p className="pt-1 text-center text-xs text-clay">{state.error}</p>
        )}

        <SubmitButton label={isSignup ? "Create account" : "Sign in"} />
      </form>

      <p className="mt-3.5 text-center text-xs text-ink-soft">
        {isSignup ? "Already have an account? " : "New here? "}
        <button
          type="button"
          onClick={() => setMode(isSignup ? "signin" : "signup")}
          className="font-medium text-indigo"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </button>
      </p>
    </Modal>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 w-full rounded-[10px] bg-indigo p-3 text-[13px] font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}
