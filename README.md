# HiStreets

HiStreets is a mobile-first local discovery platform for the London Borough of Newham. It connects residents with useful things happening nearby — local offers, jobs, free meals, community support and approved local businesses — through a map-first experience.

The product is designed around three principles: **local usefulness, explainability and privacy by default**.

## What makes HiStreets different

- **Map-first discovery** — browse approved local businesses and live opportunities without creating an account.
- **Smart local search** — search businesses, services, streets, full postcodes and outward postcodes, or use natural phrases such as “pharmacy near me” and “jobs hiring near me”.
- **HiPulse** — an explainable 0–100 local activity signal derived from currently available HiStreets offers, jobs, community support and approved-business coverage.
- **Need-to-action design** — move directly from a local signal to an offer, job, community resource or business rather than stopping at a dashboard metric.
- **Privacy-conscious architecture** — no advertising trackers, no sale of user data, private CV/evidence storage and no behavioural profile required for HiPulse or smart-search intent matching.
- **Newham-bounded operation** — postcode, business registration and public map rules are constrained to the London Borough of Newham.

## HiPulse: explainable neighbourhood intelligence

HiPulse is a HiStreets product signal that answers a practical question: **how much useful, currently actionable local activity is visible on the platform right now?**

The score is deliberately transparent. It combines four capped factors:

| Factor | Maximum | Input |
| --- | ---: | --- |
| Live activity | 40 | Current offers, jobs and community-support posts |
| Business diversity | 20 | Distinct approved business categories |
| Local coverage | 20 | Approved businesses visible to the public map |
| Signal balance | 20 | Activity spread across commerce, jobs and community support |

Every score shown in the mobile interface exposes its factor contribution. HiPulse does not use a personal profile, search history or continuous location trail.

HiPulse measures **HiStreets platform activity**. It is not an official London Borough of Newham statistic, economic forecast or ranking. See [`docs/hipulse.md`](docs/hipulse.md) for the scoring methodology, confidence language, privacy approach and current limitations.

## Core product

- Map-first local discovery bounded to Newham
- App-style smart search with live suggestions and natural-language intent matching
- Search by local business, service, street, full postcode or outward postcode
- Optional user-initiated “near me” location flow with postcode/manual-map fallback
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
- Smart-search intent matching runs in the browser and does not require sending each search phrase to a third-party AI provider.
- HiPulse uses current public platform signals rather than personal behavioural data.
- Reviews are not active in the current release.
- No advertising trackers and no sale of user data.
- No Google Places data is used for business content.

## Technology stack

- React 18
- Vite
- TypeScript
- MapLibre GL JS
- Supabase Auth
- Supabase Postgres/PostGIS
- Supabase Storage
- Progressive Web App shell
- Playwright mobile Chromium and WebKit release tests

## Engineering and release quality

The repository uses feature branches and pull requests for product changes. The release workflow checks:

- secret leakage
- production dependency audit
- unit and product-contract tests
- TypeScript compilation
- Vite production build
- mobile Chromium smoke tests
- mobile WebKit smoke tests

HiPulse has dedicated unit tests for score behaviour and browser tests for the mobile sheet and signal-to-action navigation. Existing map, location, postcode, smart-search, navigation, direct-route and PWA tests remain part of the same release gate.

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

The release hardening file keeps CVs and business verification evidence private and installs final admin permissions. The ownership file adds the existing-business ownership workflow. Boundary support makes Newham enforcement explicit. The duplicate guard prevents users from bypassing the ownership flow and refuses new registrations if the Newham boundary is missing. The last file disables legacy parking rows, views, storage access and write RPC access for this release.

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

## Release verification

Before public release verify the deployed build end to end:

1. The `Newham` row exists in `public.boundaries`, has valid geometry and the map outside-boundary mask is visible.
2. Map loads inside Newham bounds without a blocking loading state.
3. Smart search opens suggestions and natural-language intent routes to the correct local experience.
4. Business/street search works and an empty result fails gracefully.
5. Full postcode search accepts spaced or compact Newham postcodes, validates Newham by the official district code/name and rejects non-Newham postcodes.
6. Outward postcode search works only for postcode areas whose Postcodes.io district list includes Newham.
7. Postcode requests time out cleanly instead of leaving the search box stuck.
8. Location permission is requested only after a user action, works when allowed and leaves postcode/manual map use available when Safari/browser permission is denied.
9. HiPulse opens on mobile, exposes its scoring factors and links from signals to the relevant product screen.
10. The map still initialises if the Newham boundary RPC returns no feature, while business registration remains blocked server-side until the boundary is installed.
11. Business owner receives a secure email login link and reaches the Business portal.
12. Password-enabled admin account uses the same access page and reaches the Admin/Super Admin workspace.
13. Existing unclaimed approved business can be found, ownership requested and linked by Super Admin without creating a duplicate.
14. Attempting to register the same existing/pending business is rejected by the database guard.
15. Physical new-business registration submits using either precise browser location or full Newham postcode.
16. Service-area business registration verifies a Newham postcode but stores only an outward-postcode map point and no Directions action.
17. Optional verification photos are private and visible only in the admin review workflow.
18. Approval makes the new business publicly visible and removes verification evidence through the admin workflow.
19. Approved business creates offer, job, free-meal and community posts.
20. Public user can view live posts and apply to a job without creating an account.
21. CV is mandatory, remains private, is cleaned up if application creation fails, and opens for the relevant business/admin through a temporary link.
22. Physical-business directions open an external Google Maps directions URL with a readable destination.
23. All six bottom navigation destinations remain on one row in mobile Chromium and WebKit.
24. Direct `/map`, `/offers`, `/jobs`, `/community`, `/parking` and `/business` navigation renders through the SPA fallback.
25. PWA manifest and service worker load successfully.
26. Parking remains coming soon and no legacy parking data is publicly exposed.

## Product rules

- Newham only
- MapLibre only inside the product
- Google Maps is used only as an external directions link
- No Google Places data
- No fake businesses, jobs, offers, meals or parking
- No public display of unapproved businesses
- No reviews in the current release
- Parking data remains disabled until reliable local data is available
