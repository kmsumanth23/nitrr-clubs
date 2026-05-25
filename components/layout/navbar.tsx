"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { AuthModal } from "@/components/layout/auth-modal";

/**
 * Split frosted-glass nav, fixed at top.
 *  - Left pill: logo (-> home) + hamburger. Hamburger expands the pill
 *    rightward to reveal nav links. Collapses on outside click / Escape / link click.
 *  - Right pill: Sign In -> opens the centered auth modal.
 *
 * Nav targets:
 *   Home   -> #hero      (scroll)
 *   Clubs  -> #clubs     (scroll)
 *   Events -> #events    (scroll)
 *   Gallery-> /gallery   (navigate)
 *   About  -> /about     (navigate; page built later)
 *
 * Scroll links work via in-page anchors when already on "/"; otherwise they
 * route to "/#id" and the browser scrolls after navigation.
 */

type NavItem = { label: string; type: "scroll" | "route"; target: string };

const NAV: NavItem[] = [
  { label: "Home", type: "scroll", target: "hero" },
  { label: "Clubs", type: "scroll", target: "clubs" },
  { label: "Events", type: "scroll", target: "events" },
  { label: "Gallery", type: "route", target: "/gallery" },
  { label: "About", type: "route", target: "/about" },
];

export function Navbar() {
  const [open, setOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  const leftRef = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

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

  function go(item: NavItem) {
    setOpen(false); // collapse the pill after any link click
    if (item.type === "route") {
      router.push(item.target);
      return;
    }
    // scroll target
    if (pathname === "/") {
      document
        .getElementById(item.target)
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      // navigate home with hash; section ids let the browser scroll
      router.push(`/#${item.target}`);
    }
  }

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

            {/* expanding links — bigger tap targets */}
            <nav
              className={cn(
                "flex items-center overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                open ? "max-w-[520px] pr-2 opacity-100" : "max-w-0 opacity-0",
              )}
            >
              {NAV.map((item) => (
                <button
                  key={item.label}
                  onClick={() => go(item)}
                  className="rounded-full px-4 py-2.5 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </Pill>
        </div>

        {/* RIGHT PILL */}
        <button onClick={() => setAuthOpen(true)} className="pointer-events-auto">
          <Pill className="whitespace-nowrap px-[22px] py-[11px] text-[13px] font-medium text-ink hover:bg-white/80">
            Sign In
          </Pill>
        </button>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}