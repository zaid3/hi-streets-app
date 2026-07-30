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
- Business registration / ownership-request workflow with admin approval
- Optional private shop-front and inside verification photos
- Business profile management and simple posting for approved businesses
- Safe auto-approval for posts that pass clear platform rules
- Super Admin dashboard for registrations, evidence review, post moderation, job applications and platform oversight
- Parking section kept as coming soon until reliable local parking data is available

## User roles

| Role | Purpose |
| --- | --- |
| User | Browse the map, find posts and apply for jobs without logging in |
| Business | Manage an approved business, publish posts and view job applications |
| Admin | Review businesses, evidence and posts |
| Super Admin | Full platform owner view with overview metrics, approvals and application oversight |

The Business tab uses one authentication screen. Business owners can use a secure email link. Password-enabled accounts use the same form. The stored profile role determines which dashboard appears after authentication.

## Trust and privacy model

- New business registrations require approval before appearing publicly.
- Public map businesses must pass the approved-business database rule and Newham boundary check.
- Approved businesses can publish posts automatically when required fields and platform checks pass.
- Posts that need review remain pending for admin action.
- Business verification photos are private and removed through the admin decision workflow.
- Written verification notes are cleared after approval or rejection while the basic verification result/audit trail is retained.
- Job CVs are stored in a private bucket and opened through short-lived signed links by the relevant business or authorised admin.
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

## Environment variables

Frontend runtime:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Server-side maintenance secrets belong only in the local terminal or deployment environment. Do not commit service-role keys, tokens or private credentials.

## Database setup

Run the SQL files in this order from the Supabase SQL Editor:

```text
supabase/FINAL_RUN_THIS_marketplace_setup.sql
supabase/FINAL_RUN_THIS_jobs_offers_applications_no_parking.sql
supabase/FINAL_RUN_THIS_safe_auto_approval.sql
supabase/FINAL_RUN_THIS_super_admin_dashboard.sql
supabase/FINAL_RUN_THIS_release_hardening.sql
```

The final hardening file keeps CVs and business verification evidence private, applies final admin permissions and installs the release versions of the application functions.

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

Create a production build:

```bash
npm run build
```

A GitHub Actions build workflow is included under `.github/workflows/build.yml`.

## Release verification

Before public release verify the deployed build end to end:

1. Map loads inside Newham bounds and the outside-boundary mask is visible.
2. Business/street/full-postcode/outward-postcode search moves to the expected Newham area.
3. Location permission works when allowed and fails gracefully when Safari/browser permission is blocked.
4. Business owner receives a secure email login link and reaches the Business portal.
5. Password-enabled admin account uses the same access page and reaches the Admin/Super Admin workspace.
6. Business registration submits using either precise browser location or full Newham postcode.
7. Optional verification photos are private and visible only in the admin review workflow.
8. Approval makes the business publicly visible and removes verification evidence through the admin workflow.
9. Approved business creates offer, job, free-meal and community posts.
10. Public user can view live posts and apply to a job without creating an account.
11. CV is mandatory, remains private and opens for the relevant business/admin through a temporary link.
12. Business directions open an external Google Maps directions URL with a readable destination.

## Product rules

- Newham only
- MapLibre only inside the product
- Google Maps is used only as an external directions link
- No Google Places data
- No fake businesses, jobs, offers, meals or parking
- No public display of unapproved businesses
- No reviews in the current release
- Parking data remains disabled until reliable local data is available
