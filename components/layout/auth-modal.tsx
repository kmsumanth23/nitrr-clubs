"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconBrandGoogle } from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";
import {
  signInWithPassword,
  signUp,
  signInWithGoogle,
  type AuthResult,
} from "@/lib/actions/auth";
import { isAllowedEmail, ALLOWED_DOMAINS_HINT } from "@/lib/auth/policy";

/**
 * Sign in / sign up modal wired to Supabase via server actions.
 * `next` (optional) = where to send the user after login (forwarded as a hidden
 * field to the actions, and to the Google OAuth redirect).
 */
export function AuthModal({
  open,
  onClose,
  next = "/",
}: {
  open: boolean;
  onClose: () => void;
  next?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const isSignup = mode === "signup";
  const [emailValue, setEmailValue] = React.useState("");

  const action = isSignup ? signUp : signInWithPassword;
  const [state, formAction] = useActionState<AuthResult, FormData>(action, {});

  // 15e: show the domain hint only in signup mode, and only once the user
  // has typed a complete-looking email (past the @ with at least one char
  // after) whose domain isn't on the allowlist. Silent otherwise.
  const showEmailHint =
    isSignup &&
    emailValue.includes("@") &&
    emailValue.indexOf("@") < emailValue.length - 1 &&
    !isAllowedEmail(emailValue);

  // 15c: signUp returns checkInbox when email verification is pending.
  // Navigate to the verify-email page and close the modal.
  React.useEffect(() => {
    if (state.checkInbox && state.email) {
      const email = encodeURIComponent(state.email);
      router.push(`/auth/verify-email?email=${email}`);
      onClose();
    }
  }, [state.checkInbox, state.email, router, onClose]);

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

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="mb-3.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-line bg-white p-2.5 text-[13px] font-medium text-ink hover:bg-cream"
        >
          <IconBrandGoogle size={17} />
          Continue with Google
        </button>
      </form>

      <div className="mb-3.5 flex items-center gap-2.5 text-[11px] text-ink-soft before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        <span>or</span>
      </div>

      <form action={formAction}>
        <input type="hidden" name="next" value={next} />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
          className="mb-1 w-full rounded-[10px] border border-line bg-white p-2.5 text-[13px] text-ink outline-none focus:border-indigo"
        />
        {showEmailHint && (
          <p className="mb-2 text-[11px] text-clay">
            {ALLOWED_DOMAINS_HINT}
          </p>
        )}
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="mb-1 w-full rounded-[10px] border border-line bg-white p-2.5 text-[13px] text-ink outline-none focus:border-indigo"
        />

        {!isSignup && (
          <div className="mt-1 mb-2 text-right">
            <Link
              href="/auth/forgot-password"
              onClick={onClose}
              className="text-[11px] text-ink-soft hover:text-indigo hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        )}

        {state.error && (
          <p className="mb-1 mt-2 text-center text-xs text-clay">
            {state.error}
          </p>
        )}

        <SubmitButton label={isSignup ? "Sign up" : "Sign in"} />
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
      className="mt-2 w-full rounded-[10px] bg-indigo p-3 text-[13px] font-medium text-indigo-fg hover:bg-indigo/90 disabled:opacity-60"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}
