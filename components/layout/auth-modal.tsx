"use client";

import * as React from "react";
import { IconBrandGoogle } from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";

/**
 * Sign in / sign up modal. Visual only for now — wired to Supabase Auth at
 * step 6. Toggles between the two modes. No email-domain restriction:
 * Google OAuth or any valid email.
 */
export function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const isSignup = mode === "signup";

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

      <button
        type="button"
        className="mb-3.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-line bg-white p-2.5 text-[13px] font-medium text-ink hover:bg-cream"
      >
        <IconBrandGoogle size={17} />
        Continue with Google
      </button>

      <div className="mb-3.5 flex items-center gap-2.5 text-[11px] text-ink-soft before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        <span>or</span>
      </div>

      <input
        type="email"
        placeholder="Email"
        className="mb-2.5 w-full rounded-[10px] border border-line bg-white p-2.5 text-[13px] text-ink outline-none focus:border-indigo"
      />
      <input
        type="password"
        placeholder="Password"
        className="mb-1 w-full rounded-[10px] border border-line bg-white p-2.5 text-[13px] text-ink outline-none focus:border-indigo"
      />

      <button
        type="button"
        className="mt-1 w-full rounded-[10px] bg-indigo p-3 text-[13px] font-medium text-indigo-fg hover:bg-indigo/90"
      >
        {isSignup ? "Sign up" : "Sign in"}
      </button>

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
