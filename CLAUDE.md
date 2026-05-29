@AGENTS.md
# CLAUDE.md — NITRR Clubs & Committees

Guidance for Claude Code working in this repo. Read this first.

## What this project is
A full rebuild of the NIT Raipur (NITRR) clubs & committees website: a guide for
new students to discover every active club, browse events and a photo gallery, and
apply to clubs they like. Replaces an old Create-React-App + Redux + static-HTML
project.

Secondary goal: the owner is learning SWE/DevOps (HLD/LLD, SSR vs CSR, RLS, CI/CD)
through this build. Prefer clear, conventional, well-structured code over clever
code. Chat explanations should be **terse** unless asked to expand.

## Tech stack (locked)
- **Next.js 16** App Router + **TypeScript** (Turbopack default; middleware is
  exported as `proxy` from `proxy.ts`)
- **Tailwind CSS** with custom design tokens
- **shadcn/ui** + Radix for accessible primitives
- **Framer Motion** for animation
- **Supabase**: Postgres + Auth (email + Google OAuth; **no domain restriction**)
  + Storage
- **Postgres Row-Level Security** for authorization
- **React Hook Form + Zod** for forms (same schema client + server)
- **Vercel** hosting, **GitHub Actions** CI

## Roles (locked at step 9)

**Global role** (`profiles.role` enum): only `student` and `super_admin` are used.
The enum still has `'admin'` for backwards compatibility but is no longer
granted — authority comes from `club_admins` rows. (Postgres drops enum values
painfully; we ignore the value instead of removing it.)

**Per-club tiers** (`club_admins.admin_role`):
- **lead** — full control of their club, can manage other admins (4th-year)
- **manager** — content + events + gallery + applications, no admin mgmt (4th-year)
- **editor** — content only (no applications, no admin mgmt) (3rd-year)

Helper functions (defined in 09_roles.sql):
- `club_tier(uuid)` → text, returns the tier on a club or null
- `can_edit_club_content(uuid)` → editor+
- `can_manage_applications(uuid)` → manager+
- `can_manage_admins(uuid)` → lead only
- `is_super_admin()` → boolean
- `is_club_admin(uuid)` → kept as alias for `can_edit_club_content` (legacy)

**Invariants enforced by triggers:**
- A student cannot apply to a club they admin OR are already a member of
  (`trg_block_self_apply` on `applications`).
- A club must always have ≥1 lead — can't delete or demote the last lead
  (`trg_protect_last_lead` on `club_admins`).

**Workflow:** 4th-year leads run a club for the year, then hand off to incoming
4th-year juniors. Super_admin only intervenes if a club is decommissioning
(removes all admins, deletes the club).

**Multi-club admins allowed.** Edge case: blocked from applying to clubs they manage.

**Year-restricted positions are deferred** — for v1 apply is generic to the club.
When implemented later, will add a `club_positions` table and reshape the apply
flow.

## Architecture (HLD)
Layers: shared layouts → page components → reusable UI → data layer
(`lib/supabase` clients + typed query functions in `lib/queries/*`).

Rendering strategy (per route):
- **SSG**: `/about`, `/faq`
- **ISR**: `/`, `/clubs`, `/clubs/[slug]`, `/events`, `/events/[slug]`, `/gallery`
- **SSR**: `/profile`, `/admin/*`
- **CSR islands**: filter pills, forms, dashboards, gallery lightbox, navbar

Rule: *does the page depend on who's looking?* No → static (SSG/ISR). Yes → SSR.
Interactive bits within a page → Client Component islands.

## Route map
```
app/
  (marketing)/        # public
    page.tsx            # / landing (10 sections)         [ISR]
    clubs/page.tsx, clubs/[slug]/page.tsx                   [ISR]
    events/page.tsx, events/[slug]/page.tsx                 [ISR]
    gallery/page.tsx                                         [ISR]
  (auth)/             # modal-based; OAuth callback
    auth/callback/route.ts
    auth/signout/route.ts
  (student)/          # session-guarded
    profile/page.tsx                                         [SSR]
    profile/complete/page.tsx                                [SSR]
    clubs/[slug]/apply/page.tsx                              [SSR]
  (admin)/            # club_admins-guarded (built at 9b)
    admin/page.tsx and sub-pages
  proxy.ts            # Supabase session refresh
```

## Landing page (10 sections in scroll order)
1. Frosted split-pill nav (sticky). 2. Hero + Stats (one full-screen unit).
3. (merged into hero) 4. Explore clubs (fade-frost hover, 5 cards + All-Clubs).
5. How it works (3 steps). 6. Events (5 upright graduated posters, hover tilt).
7. Gallery MOMENTS (3 film strips, sprocket holes). 8. Socials. 9. FAQ.
10. Final CTA + dark footer.

## Design system
Tokens in `tailwind.config.ts` + `app/globals.css`.
- Surfaces: cream #F7F3EC, beige #F0EAE0, line #E4DCCF
- Text: ink #1C1A17, ink-soft #6B6459
- Primary: **indigo #5B52E0**
- Warm accent: **clay #C26A4A** (placeholder; may swap to honey/sage later)
- Fonts: **Bricolage Grotesque** (display) + **Geist Sans** (body)
- Animation respects `prefers-reduced-motion`
- Full-screen sections use `min-h-[100svh]` (mobile-safe vh)

## Database (living doc; see supabase/*.sql)
Hub: **clubs**. Tables:
- `profiles` (extends auth.users; role enum, branch, year, roll_number, gender)
- `categories` (Tech / Sports / Arts / Social / Professional / Culture)
- `clubs` (slug, category_id, highlights[], is_recruiting, updated_by)
- `club_admins` (authorization join: club_id + profile_id + admin_role tier)
- `club_team` (display-only coordinators; may have no account)
- `club_members` (the roster — created on application acceptance) [9a]
- `events` (club_id, slug, starts_at, reg_open, reg_url, updated_by)
- `applications` (club_id + profile_id unique, status enum, `responses` jsonb)
- `gallery_photos` (club_id + optional event_id)
- `faqs` (standalone)

RLS pattern: content tables = public read; writes gated by tier helpers.
Applications = student sees/inserts/updates own; manager+ reads/updates club's.

### Types workflow
`lib/database.types.ts` is auto-generated — never hand-edit the main body.
When adding a column: (1) run SQL migration, (2) run
`npx supabase gen types typescript --project-id <id> > lib/database.types.ts`,
(3) re-append the convenience alias block at the bottom of the file.

### Google OAuth users
OAuth users bypass the sign-up form and have `roll_number/branch/gender = null`.
`/profile/complete` exists for them to fill in missing fields.

## Conventions
- Path alias `@/*` → project root.
- Supabase clients: `@/lib/supabase/client` (Client), `@/lib/supabase/server`
  (Server / actions / route handlers). Both are tsconfig aliases — actual files
  use double-underscore names (`supabase__server.ts`, `supabase__client.ts`).
  `supabase__static.ts` — cookie-free client for `generateStaticParams` (build time).
  Never use service-role key in client code.
- Queries in `lib/queries/*` — pages call those, not raw Supabase inline.
- Forms: Zod in `lib/validation/*`, shared by RHF (client) + server action.
- Server Components by default; `"use client"` only for interactivity.
- Tokens in httpOnly cookies via `@supabase/ssr` (never localStorage).
- React 19 / Next 16: use `useActionState` (from `react`), NOT `useFormState`
  (deprecated; in `react-dom`).
- `useSearchParams()` must be in a component wrapped in `<Suspense>` — bare usage
  in a layout/page blocks static rendering for every route that includes it.
- File-creation gotcha: reserved names (`page.tsx`, `layout.tsx`, `route.ts`,
  `proxy.ts`) MUST be exact. Component/helper files can be any name.

## Things to NOT do
- No per-club hardcoded HTML — `/clubs/[slug]` template fed by the DB.
- No Redux. No localStorage tokens. No committed build artifacts.
- No inline style soup. Use Tailwind + tokens.

## Build progress
1. ✅ Scaffold + tooling
2. ✅ Supabase: schema (01), RLS (02), seed (03), clients/middleware/types
3. ✅ Design system + nav + footer
4. ✅ Landing page (10 sections wired to Supabase)
5. ✅ Clubs: /clubs list + filter, /clubs/[slug] detail
6. ✅ Auth: modal + Google OAuth + callback + session-aware navbar + guards
7. ✅ Apply flow: form + Zod + server action (RLS write) + profile completeness
8. ✅ Events + Gallery pages (+ apply sign-in flow fix)
9.  ⬜ Admin/Student dashboards — split into:
    - 9a ✅ Student profile/dashboard (+ 09_roles.sql migration)
    - 9b ✅ Admin shell + edit club content (uses tier helpers)
    - 9c ⬜ Admin events management (CRUD)
    - 9d ⬜ Admin applications review (accept → creates club_members row)
    - 9e ⬜ Admin gallery upload (Supabase Storage + image resize)
10. ⬜ Email notifications (Resend or similar; accept/reject emails)
11. ⬜ Year-restricted positions (`club_positions` table + apply reshape)
12. ⬜ Super-admin dashboard (create clubs, assign first lead, decommission)
13. ⬜ Deploy: Vercel + GitHub Actions CI

## Commands
```bash
npm run dev      # local
npm run build    # prod build
npm run lint     # eslint
npx prettier -w .
```

## Supabase setup recap
SQL in order: 01_schema → 02_rls → 03_seed → (9a) 09_roles.
Env vars in `.env.local`. Google OAuth redirect: `.../auth/callback`.
After running schema SQL, grant table privileges to `anon` and `authenticated`
roles — not done automatically via raw SQL. Without this, all queries return
42501 even with correct RLS policies.
