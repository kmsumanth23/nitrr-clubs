@AGENTS.md
# CLAUDE.md — NITRR Clubs & Committees

Guidance for Claude Code working in this repo. Read this first.

## What this project is
A full rebuild of the NIT Raipur (NITRR) clubs & committees website: a guide for
new students to discover every active club, browse events and a photo gallery, and
apply to clubs they like. Two user types: **students** and **admins** (club page
managers). Replaces an old Create-React-App + Redux + static-HTML project.

Secondary goal: the owner is learning SWE/DevOps (HLD/LLD, SSR vs CSR, RLS, CI/CD)
through this build. Prefer clear, conventional, well-structured code over clever code.
Explanations in chat should be **terse** unless asked to expand.

## Tech stack (locked)
- **Next.js 14** App Router + **TypeScript**
- **Tailwind CSS** with custom design tokens (no CSS-in-JS)
- **shadcn/ui** + Radix for accessible primitives
- **Framer Motion** for animation (scroll reveals, flips)
- **Supabase**: Postgres (data), Auth (email + Google OAuth, **no domain restriction**),
  Storage (images)
- **Postgres Row-Level Security** for authorization
- **React Hook Form + Zod** for forms (validate same schema client + server)
- **Vercel** hosting, **GitHub Actions** CI, ESLint + Prettier

## Architecture (HLD)
Layers: shared layouts → page components (one per route) → reusable UI components →
data layer (`lib/supabase` clients + typed query functions).

Rendering strategy (decide per route — this is the SSR/CSR learning axis):
- **SSG**: `/about`, `/faq` (rarely change)
- **ISR**: `/`, `/clubs`, `/clubs/[slug]`, `/events` (shared data, periodic refresh)
- **SSR**: `/profile`, `/admin/*` (depend on logged-in user — never cached)
- **CSR islands**: filter pills, apply form, dashboards (interactive `"use client"`)

Rule of thumb: *does the page depend on who's looking?* No → static (SSG/ISR).
Yes → SSR. Interactivity within a page → Client Component island on a Server shell.

## Route map (app/)
```
app/
  (marketing)/        # public, shares Navbar + Footer
    page.tsx          # /            landing (10 sections)        [ISR]
    clubs/page.tsx    # /clubs       list + filter pills          [ISR + CSR island]
    clubs/[slug]/page.tsx                                          [ISR]
    clubs/[slug]/apply/page.tsx     # auth-gated                  [SSR + CSR form]
    events/page.tsx   # /events                                   [ISR]
    events/[slug]/page.tsx                                         [ISR]
    gallery/page.tsx  # /gallery                                  [ISR]
    about/page.tsx    /faq/page.tsx /contact/page.tsx             [SSG]
  (auth)/             # minimal layout (sign-in is mostly a modal on /)
    auth/callback/route.ts          # OAuth redirect handler
  (student)/          # session-guarded
    profile/page.tsx  # /profile, my applications                 [SSR]
  (admin)/            # role-guarded (admin / super_admin)
    admin/page.tsx and sub-pages: club, events, gallery, applications [SSR]
  layout.tsx          # root: fonts + globals
  not-found.tsx
middleware.ts         # refreshes Supabase session on every request
```
Route groups in `(parens)` don't affect the URL; they share a `layout.tsx`.
Guards live in each group's `layout.tsx` (check session/role, redirect) — RLS is the
second, database-level gate.

## Landing page = 10 sections (scroll order)
1. Frosted split-pill nav (sticky). Left pill: logo (→home) + hamburger that expands
   rightward to Home/Clubs/Events/Gallery/About. Right pill: Sign In → centered modal.
2. Hero — photo mosaic + "NITRR Clubs." wordmark + Browse CTA.
3. Stats capsule strip — counts (computed via Supabase COUNT later).
4. Explore clubs — CSS flip cards (photo front; dark back w/ 3-4 `highlights`),
   tagline "Where do you belong?". Logged-out users also see "How it works" here;
   logged-in users reach it from the navbar.
5. How it works — 3 steps discover → explore → apply.
6. Events — 5 fanned poster cards.
7. Gallery — "MOMENTS" two-row marquee (opposite directions, pause on hover) + View Gallery.
8. Social handles.
9. FAQ accordion (reused on /faq).
10. Final CTA band + dark footer (only dark section).

## Design system
Tokens live in `tailwind.config.ts` + `app/globals.css` (CSS vars).
- Surfaces: cream `#F7F3EC` (bg), beige `#F0EAE0`, line `#E4DCCF`
- Text: ink `#1C1A17`, ink-soft `#6B6459`
- Primary action: **indigo `#5B52E0`** (`bg-indigo text-indigo-fg`)
- Warm accent: **terracotta/clay `#C26A4A`** (placeholder; may swap to honey `#E0A82E`
  or sage `#7C8C6A` — change the `clay` token only)
- Fonts: **Bricolage Grotesque** (display, `font-display`) + **Geist Sans** (body, `font-sans`)
- Aesthetic: frosted-glass pill nav, rounded cards, heavy display type, gentle warm
  section rhythm, only the footer is dark. Respect `prefers-reduced-motion`.

## Database (schema is a living doc; see supabase/*.sql)
`clubs` is the central hub; most tables FK to it via `club_id`.
Tables: `profiles` (extends `auth.users`; `role` enum student/admin/super_admin),
`categories`, `clubs` (slug, category_id, highlights[], is_recruiting),
`club_admins` (AUTHORIZATION: who may edit a club — many-to-many),
`club_team` (DISPLAY-ONLY coordinators; may have no account),
`events` (club_id), `applications` (club_id+profile_id unique, status enum,
`responses` jsonb for per-club questions), `gallery_photos` (club_id + optional event_id),
`faqs` (standalone).
RLS pattern: content tables = public read, writes restricted to club admins
(`is_club_admin(club_id)`) or `is_super_admin()`. `applications` = student sees/creates
own; club admin sees/updates applications for clubs they manage. Helper SQL functions:
`is_club_admin(uuid)`, `is_super_admin()`.

## Conventions
- Path alias `@/*` → project root. Imports: `@/lib/...`, `@/components/...`.
- Supabase clients: `@/lib/supabase/client` (Client Components),
  `@/lib/supabase/server` (Server Components/actions/route handlers). Never use the
  service-role key in client code.
- Data access: write typed query functions in `lib/queries/*` (added from step 4) —
  pages call those, not raw Supabase inline, so logic stays testable.
- Types from `@/lib/database.types` (`Club`, `EventRow`, `Profile`, ...).
- Forms: Zod schema in `lib/validation/*`, shared by RHF (client) and the server action.
- Server Components by default; add `"use client"` only for interactivity (flips,
  marquee, filters, forms, modal).
- Auth tokens live in httpOnly cookies via `@supabase/ssr` — never localStorage.
- No secrets in the repo. `.env.local` is gitignored; template is `.env.local.example`.
- Don't commit the `build/`/`.next/` output. Run `npm run lint` + `prettier` before commits.

## Things to NOT do (mistakes from the old project)
- No per-club hardcoded HTML pages — one `/clubs/[slug]` template fed by the DB.
- No data hardcoded into presentation — content comes from Supabase.
- No Redux. Auth/session via Supabase + cookies.
- No tokens in localStorage. No committed build artifacts. No inline-style soup.

## Build order (progress)
1. ✅ Scaffold + tooling (Next, TS, Tailwind tokens, fonts, ESLint/Prettier)
2. ✅ Supabase: schema SQL, RLS, seed, client/server/middleware helpers, types
3. ⬜ Design system + nav + footer (shared shell, UI primitives)
4. ⬜ Landing page — all 10 sections wired to Supabase
5. ⬜ Clubs: /clubs list + filter, /clubs/[slug] detail
6. ⬜ Auth: sign-in/up modal + Google OAuth + callback + route guards
7. ⬜ Apply flow: form + Zod + server action (RLS write)
8. ⬜ Events + Gallery full pages
9. ⬜ Admin dashboard (club content, events, photos, application review)
10. ⬜ Deploy: Vercel + GitHub Actions CI

## Commands
```bash
npm run dev      # local dev (http://localhost:3000)
npm run build    # production build
npm run lint     # eslint
npx prettier -w .   # format
```

## Supabase setup recap
SQL in `supabase/` runs in order: 01_schema → 02_rls → 03_seed (Supabase SQL editor).
Env vars in `.env.local` (URL, anon key, service-role key). Google OAuth redirect:
`http://localhost:3000/auth/callback` (+ Vercel URL in prod).
