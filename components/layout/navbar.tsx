"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";
import { Pill } from "@/components/ui/pill";
import { AuthModal } from "@/components/layout/auth-modal";

/**
 * Split frosted-glass nav, fixed at top.
 *  - Left pill: logo (→ home) + hamburger. Hamburger expands the pill
 *    rightward to reveal the nav links. Collapses on outside click / Escape.
 *  - Right pill: Sign In → opens the centered auth modal.
 */
export function Navbar() {
  const [open, setOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  const leftRef = React.useRef<HTMLDivElement>(null);

  // collapse on outside click + Escape
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (leftRef.current && !leftRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between p-4">
        {/* LEFT PILL */}
        <div ref={leftRef} className="pointer-events-auto">
          <Pill className="flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex flex-shrink-0 items-center gap-2.5 py-2 pl-4 pr-2">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="whitespace-nowrap font-display text-base font-extrabold tracking-tight text-ink"
              >
                NITRR<span className="text-indigo">.</span>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
                aria-label="Toggle menu"
                aria-expanded={open}
                className="flex h-[30px] w-[30px] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-full bg-ink/5 hover:bg-ink/10"
              >
                <span
                  className={cn(
                    "h-[1.5px] w-3.5 rounded bg-ink transition-all duration-300",
                    open && "translate-y-[2.75px] rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "h-[1.5px] w-3.5 rounded bg-ink transition-all duration-300",
                    open && "-translate-y-[2.75px] -rotate-45",
                  )}
                />
              </button>
            </div>

            {/* expanding links */}
            <nav
              className={cn(
                "flex items-center overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                open ? "max-w-[460px] pr-2 opacity-100" : "max-w-0 opacity-0",
              )}
            >
              {siteConfig.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-full px-3 py-1.5 text-[13px] text-ink-soft hover:bg-ink/5 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </Pill>
        </div>

        {/* RIGHT PILL */}
        <button
          onClick={() => setAuthOpen(true)}
          className="pointer-events-auto"
        >
          <Pill className="whitespace-nowrap px-[22px] py-[11px] text-[13px] font-medium text-ink hover:bg-white/80">
            Sign In
          </Pill>
        </button>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
