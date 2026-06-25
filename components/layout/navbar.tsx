"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconUser, IconLayoutDashboard, IconLogout } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { AuthModal } from "@/components/layout/auth-modal";
import { useUser } from "@/lib/hooks/use-user";
import { signOut } from "@/lib/actions/auth";

type NavItem = { label: string; type: "scroll" | "route"; target: string };

const NAV: NavItem[] = [
  { label: "Home", type: "scroll", target: "hero" },
  { label: "Clubs", type: "scroll", target: "clubs" },
  { label: "Events", type: "scroll", target: "events" },
  { label: "Gallery", type: "route", target: "/gallery" },
  { label: "About", type: "route", target: "/about" },
];

/**
 * Reads ?signin=1 / ?next= from the URL and drives the auth modal.
 * Isolated in its own component so it can sit inside <Suspense> — Next 16
 * requires useSearchParams() to be Suspense-wrapped or it breaks static
 * prerendering of pages that render the navbar.
 */
function AuthFromParams({
  user,
}: {
  user: ReturnType<typeof useUser>["user"];
}) {
  const searchParams = useSearchParams();
  const [authOpen, setAuthOpen] = React.useState(false);
  const nextParam = searchParams.get("next") ?? "/";

  React.useEffect(() => {
    if (searchParams.get("signin") === "1" && !user) setAuthOpen(true);
  }, [searchParams, user]);

  return (
    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} next={nextParam} />
  );
}

export function Navbar() {
  const [open, setOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const leftRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, fullName, isClubAdmin, loading } = useUser();
  const showAdminLink = isClubAdmin || role === "super_admin";

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (leftRef.current && !leftRef.current.contains(e.target as Node))
        setOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(item: NavItem) {
    setOpen(false);
    if (item.type === "route") {
      router.push(item.target);
      return;
    }
    if (pathname === "/") {
      document.getElementById(item.target)?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push(`/#${item.target}`);
    }
  }

  const initial =
    fullName?.[0]?.toUpperCase() ??
    user?.user_metadata?.name?.[0]?.toUpperCase() ??
    user?.user_metadata?.full_name?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "U";

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
        <div ref={menuRef} className="pointer-events-auto">
          {loading ? null : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Account menu"
                className="flex items-center"
              >
                <Pill className="flex h-[42px] w-[42px] items-center justify-center text-sm font-semibold text-ink">
                  {initial}
                </Pill>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-soft">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-cream"
                  >
                    <IconUser size={16} /> Profile
                  </Link>
                  {showAdminLink && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-cream"
                    >
                      <IconLayoutDashboard size={16} /> Admin
                    </Link>
                  )}
                  <form action={signOut} className="border-t border-line">
                    <button
                      type="submit"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-clay hover:bg-cream"
                    >
                      <IconLogout size={16} /> Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)}>
              <Pill className="whitespace-nowrap px-[22px] py-[11px] text-[13px] font-medium text-ink hover:bg-white/80">
                Sign In
              </Pill>
            </button>
          )}
        </div>
      </header>

      {/* manual open (Sign In button) */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* URL-driven open (?signin=1) — Suspense-wrapped for useSearchParams */}
      <React.Suspense fallback={null}>
        <AuthFromParams user={user} />
      </React.Suspense>
    </>
  );
}
