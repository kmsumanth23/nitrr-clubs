"use client";

import * as React from "react";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Centered modal overlaying the page. Closes on backdrop click and Escape.
 * Locks body scroll while open. Used by the sign-in flow.
 */
export function Modal({ open, onClose, children, className }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/55 p-6 backdrop-blur-sm"
    >
      <div
        className={cn(
          "relative w-full max-w-sm rounded-[20px] bg-cream p-7 shadow-2xl",
          "max-h-[90vh] overflow-y-auto",
          "motion-safe:animate-modal-pop",
          className,
        )}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-ink/5 text-ink-soft hover:bg-ink/10"
        >
          <IconX size={15} />
        </button>
        {children}
      </div>
    </div>
  );
}
