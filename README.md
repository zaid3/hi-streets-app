# HiStreets

HiStreets is a mobile-first local discovery platform for the London Borough of Newham.

The app helps residents find nearby offers, local jobs, free meals and community support from approved local businesses and community organisations. It is designed for simple public use, low-friction business participation and privacy-conscious local operation.

## Core product

- Map-first local discovery for Newham
- Nearby offers, jobs, free meals and community support
- Public browsing without account creation
- Job applications without sign-up, with mandatory CV upload
- Business sign-up and profile management
- Simple posting for approved businesses
- Safe auto-approval for posts that pass clear rules
- Super Admin dashboard for approvals, content review and platform oversight
- Parking section kept as a coming-soon feature until reliable local data is available

## User roles

| Role | Purpose |
| --- | --- |
| User | Browse the map, find posts and apply for jobs without logging in |
| Business | Manage an approved business, publish posts and view job applications |
| Admin | Help review businesses and posts |
| Super Admin | Full platform owner view with overview metrics and approval controls |

## Trust and safety model

HiStreets keeps the public app simple while protecting trust in local content.

- New business registrations require approval before appearing publicly.
- Approved businesses can publish posts automatically if required fields and safety rules pass.
- Risky or incomplete posts stay in review.
- Job applicants are contacted directly by the business using the contact details they provide.
- Reviews are not active in the current version to avoid unnecessary moderation and privacy risk.

## Privacy approach

- No advertising trackers
- No sale of user data
- No live location tracking
- Location permission is used only to show nearby results on the device
- CVs are used only for job applications and are visible to the relevant business/admin flow
- No Google Places data is used for business content

## Technology stack

- React
- Vite
- TypeScript
- MapLibre GL JS
- Supabase Auth
- Supabase Postgres/PostGIS
- Supabase Storage
- Progressive Web App shell

## Environment variables

Frontend runtime:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Server-side import or maintenance scripts must use secrets only in the local terminal or deployment environment. Do not commit service-role keys, tokens or private credentials.

## Database setup

Run the SQL files in this order from the Supabase SQL Editor:

```text
supabase/FINAL_RUN_THIS_marketplace_setup.sql
supabase/FINAL_RUN_THIS_jobs_offers_applications_no_parking.sql
supabase/FINAL_RUN_THIS_safe_auto_approval.sql
supabase/FINAL_RUN_THIS_super_admin_dashboard.sql
```

After the Super Admin SQL is installed, set the platform owner account:

```sql
update public.profiles
set role = 'super_admin'
where id = (
  select id
  from auth.users
  where email = 'YOUR_EMAIL_HERE'
);
```

## Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Deployment checklist

- Configure `VITE_SUPABASE_URL`
- Configure `VITE_SUPABASE_ANON_KEY`
- Run the required Supabase SQL files
- Set the platform owner as `super_admin`
- Deploy the latest main branch
- Test the map, location prompt, public tabs, business login, business registration, post creation and job application flow

## Product rules

- Newham only
- MapLibre only
- No Google Places data
- No fake businesses, jobs, offers, meals or parking
- No public display of unapproved businesses
- No monetisation in the current version
- No reviews in the current version
- Parking data remains disabled until reliable local data is available
