"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconUser, IconLayoutDashboard, IconLogout } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { AuthModal } from "@/components/layout/auth-modal";
import { useUser } from "@/lib/hooks/use-user";

/** Isolated so it can be wrapped in Suspense — useSearchParams() opts the
 *  entire component tree out of static rendering if used without a boundary. */
function SearchParamsSync({
  user,
  setNextParam,
  openAuth,
}: {
  user: unknown;
  setNextParam: (v: string) => void;
  openAuth: () => void;
}) {
  const searchParams = useSearchParams();
  React.useEffect(() => {
    setNextParam(searchParams.get("next") ?? "/");
    if (searchParams.get("signin") === "1" && !user) openAuth();
  }, [searchParams, user, setNextParam, openAuth]);
  return null;
}

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
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [nextParam, setNextParam] = React.useState("/");
  const leftRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading } = useUser();
  const isAdmin = role === "admin" || role === "super_admin";

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
    user?.email?.[0]?.toUpperCase() ??
    user?.user_metadata?.name?.[0]?.toUpperCase() ??
    "U";

  const openAuth = React.useCallback(() => setAuthOpen(true), []);

  return (
    <>
      <React.Suspense>
        <SearchParamsSync user={user} setNextParam={setNextParam} openAuth={openAuth} />
      </React.Suspense>
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
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-cream"
                    >
                      <IconLayoutDashboard size={16} /> Admin
                    </Link>
                  )}
                  <a
                    href="/auth/signout"
                    className="flex items-center gap-2.5 border-t border-line px-4 py-2.5 text-sm text-clay hover:bg-cream"
                  >
                    <IconLogout size={16} /> Sign out
                  </a>
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

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        next={nextParam}
      />
    </>
  );
}
