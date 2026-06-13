This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel 

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


my memory:

## club lead should also have the change log for there club 
a json file change log which shows who edited what including them

come up with a plan to assigne the admins access

the name when updated is not updated on the authenication table

add a year update prompt every year

super admin must be able to add or remove admins through web only by using email addresses or roll numbers or any other unique vars

make sure future db access are through authenticated users

active members must be auto

plan out the application review process like meet links and all

try whatsapp intigration using mobile numbers

1. My Clubs page (2026-05-27)
A button/page for logged-in users to view clubs they've applied to or joined. Likely a tab on /profile or a separate /profile/my-clubs page. Query applications + club_members filtered by profile_id.

2. Recruiter Meet Link (2026-05-27)
Club admins can attach a Google Meet link to an application during review. Student sees it on their profile when status is reviewing. Needs a meet_link column on applications (or in the responses jsonb). Could tie into step 10 (email notifications).

3. Welcome Back Pill (2026-05-29)
Animated pill next to the profile avatar after login — says "Welcome back" and fades out after ~3 seconds. Detect !user → user transition in Navbar, render with CSS fade-out animation, clear via setTimeout.

4. Post-Deploy Claude Analysis (2026-05-28)
After step 13 (deploy), run a full Claude Code analysis pass: a11y, performance, UX flows, code quality.

5. use roll number to verify user there can never exist 2 users with same roll number.

6. add a search baar to admin dashboard we can copy it from the clubs page 

club member count must be automatic

application history

side bar c for switch clubs

assign club managers for recrutment 

review history should also be maintained who accepted rejected or put the app in review of that student just like notes history

note history is global with respct to club and recruit 

even when there are no applications the publish result is shown fix that

manager should be able to get the list of all the members in the club. download as pdf same for number of applicants to check if they have joined the group

super admins should also have ability to create clubs

rewrite and redirect for unautherized link access.

admin should be able to create any type of event. ex shaurya

every user must see there badge in there clubs in my profile