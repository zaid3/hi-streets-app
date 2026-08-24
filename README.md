# HiStreets

HiStreets is a mobile-first local discovery platform for the London Borough of Newham.

The app helps residents find nearby offers, local jobs, free meals and community support from approved local businesses and community organisations. It is designed for simple public use, low-friction business participation and privacy-conscious local operation.

## Core product

- Map-first local discovery bounded to Newham
- Search by local business, street, full postcode or outward postcode
- Nearby offers, jobs, free meals and community support
- Public browsing without account creation
- Job applications without sign-up, with mandatory private CV upload
- One secure access page for business owners and admins
- New-business registration plus ownership requests for existing approved, unclaimed listings
- Backend duplicate protection for existing and already-pending business registrations
- Optional private shop-front and inside verification photos for physical shops
- Service-area / online business registration without publishing a home street address or precise home location
- Business profile management and simple posting for approved businesses
- Safe auto-approval for posts that pass clear platform rules
- Super Admin dashboard for ownership requests, registrations, evidence review, post moderation, job applications and platform oversight
- Parking section kept as coming soon until reliable local parking data is available

## User roles

| Role | Purpose |
| --- | --- |
| User | Browse the map, find posts and apply for jobs without logging in |
| Business | Manage an approved business, publish posts and view job applications |
| Admin | Review ownership requests, businesses, evidence and posts |
| Super Admin | Full platform owner view with overview metrics, approvals and application oversight |

The Business tab uses one authentication screen. Business owners can use a secure email link. Password-enabled accounts use the same form. The stored profile role determines which dashboard appears after authentication.

## Trust and privacy model

- New business registrations require approval before appearing publicly.
- Existing approved, unclaimed businesses can be linked through an admin-reviewed ownership request rather than creating a duplicate listing.
- Exact existing or pending business registrations are also blocked at the database layer.
- Public map businesses must pass the approved-business database rule and Newham boundary check.
- Business registration fails closed if the official Newham boundary has not been installed.
- Service-area businesses verify a full Newham postcode but store only the outward postcode area as the public map point and do not show a Directions action.
- Approved businesses can publish posts automatically when required fields and platform checks pass.
- Posts that need review remain pending for admin action.
- Business verification photos are private and removed through the admin decision workflow.
- Written verification notes are cleared after approval or rejection while the basic verification result/audit trail is retained.
- Job CVs are stored in a private bucket and opened through short-lived signed links by the relevant business or authorised admin.
- Failed job applications clean up the just-uploaded CV instead of leaving an orphan file.
- Reviews are not active in the current release.
- No advertising trackers and no sale of user data.
- No Google Places data is used for business content.

## Technology stack

- React
- Vite
- TypeScript
- MapLibre GL JS
- Supabase Auth
- Supabase Postgres/PostGIS
- Supabase Storage
- Progressive Web App shell
- Playwright mobile Chromium and WebKit release tests

## Environment variables

Frontend runtime:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Boundary maintenance/import only:

```bash
VITE_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Server-side maintenance secrets belong only in the local terminal or deployment environment. Do not commit service-role keys, tokens or private credentials.

## Database setup

### 1. Install the application database rules

Run these SQL files in this order from the Supabase SQL Editor:

```text
supabase/FINAL_RUN_THIS_marketplace_setup.sql
supabase/FINAL_RUN_THIS_jobs_offers_applications_no_parking.sql
supabase/FINAL_RUN_THIS_safe_auto_approval.sql
supabase/FINAL_RUN_THIS_super_admin_dashboard.sql
supabase/FINAL_RUN_THIS_release_hardening.sql
supabase/FINAL_RUN_THIS_ownership_requests.sql
supabase/FINAL_RUN_THIS_boundary_support.sql
```

### 2. Install the official Newham boundary

From a trusted local/operator environment, set `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run:

```bash
npm run seed:boundary
```

The importer fetches an official Newham local-authority boundary, writes it through the service-role-only boundary RPC and removes only unclaimed OSM imports that are outside the borough. Do not put the service-role key in the frontend environment.

Confirm the boundary exists before continuing:

```sql
select name, st_isvalid(geom) as valid, source, updated_at
from public.boundaries
where name = 'Newham';
```

There must be exactly one `Newham` row and `valid` must be `true`.

### 3. Install the final registration and parking guards

Run:

```text
supabase/FINAL_RUN_THIS_duplicate_guard.sql
supabase/FINAL_RUN_THIS_disable_parking.sql
```

The release hardening file keeps CVs and business verification evidence private and installs final admin permissions. The ownership file adds the existing-business ownership workflow. Boundary support makes Newham enforcement explicit. The duplicate guard prevents users from bypassing the ownership flow and now refuses new registrations if the Newham boundary is missing. The last file disables legacy parking rows, views, storage access and write RPC access for this release.

After the SQL is installed, set the platform owner account:

```sql
update public.profiles
set role = 'super_admin'
where id = (
  select id
  from auth.users
  where email = 'YOUR_EMAIL_HERE'
);
```

The Auth user must exist first. Log in once or create the user in Supabase Authentication before assigning the role.

## Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run source/unit release tests:

```bash
npm run test:unit
```

Run the production TypeScript/Vite build:

```bash
npm run build
```

Run the mobile browser release suite locally after installing Playwright browsers:

```bash
npx playwright install chromium webkit
npm run test:e2e
```

The GitHub `Security and release` workflow runs secret scanning, a production dependency audit, unit/release-contract tests, TypeScript, a production build, and mobile Chromium/WebKit smoke tests.

## Release verification

Before public release verify the deployed build end to end:

1. The `Newham` row exists in `public.boundaries`, has valid geometry and the map outside-boundary mask is visible.
2. Map loads inside Newham bounds without a blocking loading state.
3. Business/street search works and an empty result fails gracefully.
4. Full postcode search accepts spaced or compact Newham postcodes, validates Newham by the official district code/name and rejects non-Newham postcodes.
5. Outward postcode search works only for postcode areas whose Postcodes.io district list includes Newham.
6. Postcode requests time out cleanly instead of leaving the search box stuck.
7. Location permission is requested only after a user action, works when allowed and leaves postcode/manual map use available when Safari/browser permission is denied.
8. The map still initialises if the Newham boundary RPC returns no feature, while business registration remains blocked server-side until the boundary is installed.
9. Business owner receives a secure email login link and reaches the Business portal.
10. Password-enabled admin account uses the same access page and reaches the Admin/Super Admin workspace.
11. Existing unclaimed approved business can be found, ownership requested and linked by Super Admin without creating a duplicate.
12. Attempting to register the same existing/pending business is rejected by the database guard.
13. Physical new-business registration submits using either precise browser location or full Newham postcode.
14. Service-area business registration verifies a Newham postcode but stores only an outward-postcode map point and no Directions action.
15. Optional verification photos are private and visible only in the admin review workflow.
16. Approval makes the new business publicly visible and removes verification evidence through the admin workflow.
17. Approved business creates offer, job, free-meal and community posts.
18. Public user can view live posts and apply to a job without creating an account.
19. CV is mandatory, remains private, is cleaned up if application creation fails, and opens for the relevant business/admin through a temporary link.
20. Physical-business directions open an external Google Maps directions URL with a readable destination.
21. All six bottom navigation destinations remain on one row in mobile Chromium and WebKit.
22. Direct `/map`, `/offers`, `/jobs`, `/community`, `/parking` and `/business` navigation renders through the SPA fallback.
23. PWA manifest and service worker load successfully.
24. Parking remains coming soon and no legacy parking data is publicly exposed.

## Product rules

- Newham only
- MapLibre only inside the product
- Google Maps is used only as an external directions link
- No Google Places data
- No fake businesses, jobs, offers, meals or parking
- No public display of unapproved businesses
- No reviews in the current release
- Parking data remains disabled until reliable local data is available
