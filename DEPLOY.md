# Deploy

End-to-end walkthrough for taking NITRR Clubs from a working local dev
environment to a live production URL on Vercel. Designed to be followed
once; written so future-you (or a handover engineer) can repeat it.

---

## Part 1 — Pre-deploy verification

Walk through these BEFORE attempting the Vercel deploy. Skip nothing.

### 1.1 Local build must pass clean

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

All four must succeed without errors. Warnings in lint output are OK; errors
are blockers.

If `npm run typecheck` fails: a recent code change broke type contracts.
Fix locally before pushing.

If `npm run build` fails: usually an env var or import issue. Common ones:
- A query file imports from a path that doesn't exist
- A type isn't exported where it's imported
- A server-only API is being used in a client component (or vice versa)

### 1.2 Supabase preflight

Open the Supabase Dashboard → SQL Editor. Open `scripts/preflight.sql` from
the repo and paste the whole thing into the editor. Run it.

The query returns a series of rows like:
```
check_name                              | result
----------------------------------------+--------
table: profiles                          | OK
table: clubs                             | OK
...
function: add_club_admin                 | OK
storage bucket: club-gallery             | OK
clubs without admins                     | OK
```

**Every row must say `OK` or `WARN`. A single `FAIL` is a blocker.**

Common FAIL causes and fixes:
- "table missing" → a migration didn't run. Find the `09*.sql` that creates
  it and run that file in the SQL editor.
- "RLS disabled" → re-run the policy block in the corresponding migration.
- "function missing" → re-run the migration that defines it.
- "bucket missing" → re-run `09e_gallery.sql`.
- "archived_at column missing" → re-run `09g_sysadmin_more.sql`.

`WARN` rows are non-blocking but worth noting:
- "clubs without admins" — these clubs work but coordinators can't manage
  them via UI. Assign at least one admin per club via the SQL editor or via
  the sysadmin Create Club flow.

### 1.3 Code hygiene scan

```bash
# Should return nothing or only documented test data
grep -rn "console.log" lib/ app/ components/ --include="*.ts" --include="*.tsx"

# Should NOT find any hardcoded keys
grep -rn "supabase_anon_key\|service_role" --include="*.ts" --include="*.tsx"

# .env.local should be ignored by git
git check-ignore .env.local
# Expected output: .env.local

# No env files should be tracked
git ls-files | grep "^\.env"
# Expected output: only .env.example
```

### 1.4 Confirm test accounts (optional, but useful for smoke test)

You'll want known accounts to test with after deploy. Confirm these exist
in your production Supabase:

```sql
select email, full_name, role from profiles
where email in (
  'examplemail@gmail.com',
  'recruit@nitrr.ac.in'
);
```

Should return at least Gladiator (sysadmin) and Recruit (student). If
missing, sign up via the production site after deploy.

---

## Part 2 — Deploy to Vercel

### 2.1 Push to GitHub

Make sure your `main` branch is up to date and pushed.

```bash
git status        # should be clean
git push origin main
```

If you haven't already, ensure the repo is **public** OR you've connected
Vercel to a private repo via the GitHub integration.

### 2.2 Create Vercel project

1. Sign in to [vercel.com](https://vercel.com) with the GitHub account that
   owns the repo.
2. Click **Add New → Project**.
3. **Import** the `nitrr-clubs` repository.
4. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** leave blank (Vercel handles this)
5. Click **Environment Variables** and add (see next section).
6. Click **Deploy** — but wait until env vars are set, or the first deploy
   will fail.

### 2.3 Environment variables on Vercel

In the Vercel project setup screen (or later: Project Settings → Environment
Variables), add:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase: Project Settings → API → Project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase: Project Settings → API → `anon` `public` key | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://nitrr-clubs.vercel.app` (or your actual final URL) | Production only |

For Preview and Development environments of `NEXT_PUBLIC_SITE_URL`, you can
leave it unset — Next.js falls back to inferring from the request URL.

Click **Deploy** to trigger the first build.

### 2.4 Wait for build, then check

The build takes 1-3 minutes. Watch the deploy log. If it fails, the most
common issues are:

- **Missing env var:** "ReferenceError: process.env.NEXT_PUBLIC_SUPABASE_URL
  is not defined." Set it and redeploy.
- **TypeScript error:** rare if CI passed; rerun `npm run build` locally to
  reproduce.
- **Module not found:** an import path is broken. Same — reproduce locally.

When the deploy succeeds, Vercel shows you the URL (e.g.
`nitrr-clubs.vercel.app`).

---

## Part 3 — Configure Supabase Auth for production

Your local dev was hitting Supabase from `localhost:3000`. Production needs
different config to allow your Vercel URL.

### 3.1 Site URL and redirects

In Supabase Dashboard:

1. **Authentication → URL Configuration**
2. **Site URL:** set to `https://nitrr-clubs.vercel.app` (your production URL)
3. **Redirect URLs:** add the following (one per line):
   ```
   https://nitrr-clubs.vercel.app/**
   http://localhost:3000/**
   ```
   The wildcard `/**` covers all sub-paths including `/auth/callback`.
   Keep `localhost:3000` so you can still sign in during local dev.

### 3.2 Email auth settings

1. **Authentication → Providers → Email**
2. **Enable Email provider:** ON
3. **Confirm email:** ON (recommended — prevents fake signups)
4. **Secure email change:** ON

### 3.3 SMTP for password reset emails

Supabase's built-in SMTP works out of the box but has tight rate limits
(~4 emails/hour). For low-traffic launch that's fine. If you hit limits or
emails arrive in spam:

1. **Authentication → Settings → SMTP Settings**
2. Configure a custom SMTP provider. Recommended free tier: **Resend**
   (100 emails/day free, 3000/month).
3. Resend setup:
   - Sign up at [resend.com](https://resend.com)
   - Create an API key
   - Verify a sending domain (or use Resend's test domain initially)
   - Plug into Supabase SMTP settings

Defer this until you hit a rate limit. Not needed for initial launch.

### 3.4 Google OAuth (deferred)

The Google OAuth code path is in place (since step 6) but the OAuth console
isn't configured. You can launch without it — email/password works fine.
When ready:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Configure OAuth consent screen + create OAuth credentials (Web app type)
3. Authorized redirect URIs:
   `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. In Supabase: Authentication → Providers → Google → enable + paste
   Client ID and Client Secret

Allow 24 hours for Google verification to remove the "unverified app"
warning. Internal NITRR users can click through the warning safely.

---

## Part 4 — First smoke test on production

Visit `https://nitrr-clubs.vercel.app` and walk through:

### 4.1 Public site

- [ ] Landing page loads, all 10 sections render
- [ ] Clubs grid populated (or shows "no clubs" if you cleared data)
- [ ] Click into a club page — content loads
- [ ] Gallery section shows photos (or empty state)
- [ ] FAQ accordion works
- [ ] Mobile responsive (test on phone or DevTools)

### 4.2 Auth flow

- [ ] Click Sign in — modal opens
- [ ] Email signup with a new test email
- [ ] Verification email arrives (check spam too)
- [ ] Click verification link, returns to site, signed in
- [ ] Profile page loads with empty state

### 4.3 Admin flow

Sign in as Gladiator (sysadmin).

- [ ] Admin dashboard shows clubs
- [ ] Open a club's Edit page — content loads
- [ ] Recruitment page shows phase and form
- [ ] Members page loads
- [ ] Gallery page loads
- [ ] Try uploading a photo — should succeed
- [ ] Sysadmin landing page loads (`/admin/sysadmin`)
- [ ] Audit log shows recent entries

### 4.4 CSV export

- [ ] Click Export CSV on the Members page
- [ ] File downloads with sensible filename
- [ ] Open in Excel — columns sensible
- [ ] Toggle Anonymize PII, re-download — email + roll masked correctly

### 4.5 Things to verify after smoke test

- [ ] Vercel logs (Project → Deployments → latest → Functions logs) show no
      unexpected errors
- [ ] Supabase Dashboard → Logs → API logs show queries running
- [ ] No `console.error` outputs in browser DevTools

---

## Part 5 — Post-deploy

### 5.1 Set up branch protection (recommended)

In GitHub repo settings:
- Settings → Branches → Add rule for `main`
- Require pull request before merging
- Require status checks: tick the CI workflow's `check` job
- Now nobody can push directly to `main` and broken code gets caught

### 5.2 Monitor

For v1, Vercel's built-in logs are enough. Visit the project on Vercel and
keep an eye on the Deployments and Functions tabs after launch.

### 5.3 Tell people

You're live. Share the URL with NITRR coordinators or whoever's testing.

---

## Common deploy issues

### Build fails on Vercel but passes locally

Most likely cause: an env var is set locally but missing on Vercel. Check
the Vercel build log for "ReferenceError: process.env.X is not defined."

### Images don't load on production

The gallery uses Supabase Storage's public URLs directly via `<img>`. They
work without any Next.js Image config. If you DO use `<Image>` from Next.js
with Supabase URLs, you'll need to add the domain to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "your-project-id.supabase.co",
      },
    ],
  },
};
```

### Auth redirects to localhost after sign-in

You forgot to set `NEXT_PUBLIC_SITE_URL` on Vercel OR you forgot to update
Supabase Auth Site URL.

### "Module not found" in production

The flat-naming convention (`__` as path separator) sometimes confuses on
case-sensitive filesystems. Vercel uses Linux, which is case-sensitive.
Local macOS isn't. If you see "Module not found" on Vercel only, check the
casing of your imports.

### Storage uploads fail with "permission denied"

The Storage RLS policies on `storage.objects` haven't been applied. Re-run
`09e_gallery.sql`. Verify with:
```sql
select policyname from pg_policies
where schemaname = 'storage' and tablename = 'objects';
```

Should return 4 rows starting with `club-gallery:`.

---

## Rollback

If a deploy goes badly:

1. **Vercel:** Project → Deployments → find the previous working deploy →
   click `...` → Promote to Production. Instant rollback.
2. **Database:** No automated rollback. Supabase has point-in-time recovery
   on paid tiers; on free tier, restore from your last manual export. Worth
   doing a Supabase dashboard backup before any large schema change.

---

## Future steps from here

After successful deploy, the roadmap continues:

- **Step 14** — Content management (FAQ editor, category editor, activity feed, storage usage report, bulk import)
- **Step 15** — Notifications (email via Resend, banner system)
- **Step 16** — Year-restricted positions + custom questions + WhatsApp reveals (the big content step)
- **Step 17** — Advanced exports + reporting (PDF, per-cycle reports)
- **Step 18** — Polish + extras
- **Step 19** — UI/UX pass (runs in parallel)

See `CLAUDE.md` for full roadmap detail.
