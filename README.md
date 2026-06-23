# NITRR Clubs

A modern web platform for NIT Raipur clubs and committees. Public site for
students to discover clubs and apply; admin tools for club coordinators to
manage recruitments, events, members, and content; sysadmin controls for
system-wide governance.

Replaces the legacy CRA + Redux + static HTML site with a Next.js + Supabase
architecture.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**, **Tailwind CSS**
- **Supabase** — Postgres + Auth + Storage, with RLS for authority
- **React 19** (Server Components + `useActionState`)
- **Vercel** hosting
- **GitHub Actions** for CI

## Local development

Requirements: Node 20+, npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure env vars
cp .env.example .env.local
# Edit .env.local with your Supabase project URL + anon key.

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

## Project structure

```
app/                  Routes (App Router)
  (marketing)/        Public pages (home, clubs, events, gallery, etc.)
  (auth)/             Sign-in flow + OAuth callback
  (student)/          Student profile
  (admin)/            Admin dashboard + per-club management + sysadmin
components/           UI components, grouped by feature
lib/
  queries/            Server-side data fetching (RLS-aware)
  actions/            Server actions (mutations)
  supabase/           Supabase client variants (server / client / static / middleware)
  validation/         Zod schemas
  storage/            Storage helpers (gallery)
  csv/                CSV formatting (exports)
  audit/              Audit log helpers
supabase/             SQL migrations (numbered)
scripts/              One-off SQL utilities (preflight, etc.)
proxy.ts              Middleware (Next 16 rename)
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — living source of truth: schema, role model,
  recruitment lifecycle, conventions, lessons learned
- **[DEPLOY.md](./DEPLOY.md)** — production deploy walkthrough + smoke test

## Scripts

```bash
npm run dev         # Start dev server (Turbopack)
npm run build       # Production build
npm run start       # Run production build locally
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
```

## License

Private project. Will be transferred to NITRR for institutional use.

---

## my memory

On-spot ideas captured during the build. Some have been addressed (marked
`✓ done`), some are bugs to investigate, some are future ideas. Kept here as
the original brain-dump so nothing is lost.

### General ideas
- club lead should also have the change log for there club  *(✓ done — per-club audit log in 12c)*
- a json file change log which shows who edited what including them  *(✓ done — audit_log table with details jsonb in 12a/c)*
- come up with a plan to assigne the admins access  *(✓ done — per-club admin management in 12a)*
- the name when updated is not updated on the authenication table  *(bug to investigate — `auth.users` raw_user_meta_data may need sync)*
- add a year update prompt every year  *(future — annual year roll-over flow)*
- super admin must be able to add or remove admins through web only by using email addresses or roll numbers or any other unique vars  *(✓ done — profile search by name/email/roll in 12a)*
- make sure future db access are through authenticated users  *(✓ done — all queries use authenticated Supabase client + RLS)*
- active members must be auto  *(✓ done — auto-materialize on publish in 9d-fixes)*
- plan out the application review process like meet links and all  *(partial — review process done in 9d; meet links not yet)*
- try whatsapp intigration using mobile numbers  *(future — currently using WhatsApp group invite links; mobile-number integration is deeper)*

### Dated items

**1. My Clubs page (2026-05-27)**
A button/page for logged-in users to view clubs they've applied to or
joined. Likely a tab on /profile or a separate /profile/my-clubs page.
Query applications + club_members filtered by profile_id.  *(✓ done — "My
clubs" section on /profile; Active/History split for applications)*

**2. Recruiter Meet Link (2026-05-27)**
Club admins can attach a Google Meet link to an application during review.
Student sees it on their profile when status is reviewing. Needs a meet_link
column on applications (or in the responses jsonb). Could tie into step 10
(email notifications).  *(future — fits naturally with step 15 notifications
or step 16 recruitment redesign)*

**3. Welcome Back Pill (2026-05-29)**
Animated pill next to the profile avatar after login — says "Welcome back"
and fades out after ~3 seconds. Detect !user → user transition in Navbar,
render with CSS fade-out animation, clear via setTimeout.  *(future — UI/UX
pass, step 19)* we can just retype the nitrr logo to welcome back first name and then again type back the club name

**4. Post-Deploy Claude Analysis (2026-05-28)**
After step 13 (deploy), run a full Claude Code analysis pass: a11y,
performance, UX flows, code quality.  *(scheduled — runs after step 13b
completes)*

### More ideas

- use roll number to verify user there can never exist 2 users with same roll number  *(bug to investigate — needs unique constraint on `profiles.roll_number` + signup validation)*
- add a search baar to admin dashboard we can copy it from the clubs page  *(future — useful when number of admin clubs grows; defer to UI/UX pass)*
- club member count must be automatic  *(future — currently manual override field; should be a denormalized count of `club_members` rows, updated by trigger or recalc action; defer to step 14 with `recompute_member_count` RPC)*
- application history  *(✓ done — Active/History split on /profile in 9f-3)*
- side bar c for switch clubs  *(✓ done — admin sidebar has switch club popover from 9b)*
- assign club managers for recrutment  *(✓ done — admin tier management in 12a)*
- review history should also be maintained who accepted rejected or put the app in review of that student just like notes history  *(partial — audit_log captures state changes; per-application timeline UI not yet)*
- note history is global with respct to club and recruit  *(future — currently one note per application; if you want per-cycle note history, needs schema change)*
- note history is global with respect to club and recruit  *(same as above)*
- even when there are no applications the publish result is shown fix that  *(bug to investigate — Publish panel visibility logic on Applications page; possibly already fixed by 9d-fixes phase logic but worth re-verifying after deploy)*
- manager should be able to get the list of all the members in the club. download as pdf same for number of applicants to check if they have joined the group  *(✓ done for CSV in 12c — PDF deferred to step 17)*
- super admins should also have ability to create clubs  *(✓ done — sysadmin Create Club flow in 12b)*
- rewrite and redirect for unautherized link access  *(✓ done — admin/sysadmin routes redirect; could be more granular per resource later)*
- admin should be able to create any type of event. ex shaurya  *(✓ done — admin events CRUD in 9c)*
- every user must see there badge in there clubs in my profile  *(future — show "Lead/Manager/Editor/Member" badge per club on /profile; UI/UX pass)*
- when viewd on the galary photo on homepage it must show the details of the photo of what events it was from and club  *(future — lightbox/modal on homepage gallery with metadata; UI/UX pass + needs photo→event linking which currently isn't enforced since gallery is standalone per Model A from step 9e)*