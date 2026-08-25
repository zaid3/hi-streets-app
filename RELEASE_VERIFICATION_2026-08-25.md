# HiStreets release verification — 2026-08-25

This document records what the automated release gate proves and what still requires a real production interaction.

## Automated release gate

The release workflow must pass:
- secret scan
- production dependency audit gate
- unit/release contracts
- TypeScript
- production build
- Chromium mobile browser tests
- iPhone/WebKit browser tests
- desktop Chromium business-shell tests

The mobile browser suite includes a geometry regression check ensuring the Business/Admin brand banner and authentication card do not overlap, and that the bottom of the access page can scroll clear of fixed navigation.

## Feature contracts covered by code/tests

- Public map and user-initiated geolocation
- Newham full/outward postcode validation and outside-borough rejection
- Smart natural-language search routing
- Offers, jobs and community feed navigation/scrolling
- Ask HiStreets UI and server-only AI gateway contract
- Sensitive-query local/private fallback contract
- HiPulse deterministic 0–100 calculation and explainability
- Business/Admin responsive access and account lifecycle UI
- Password sign-in, account creation, password reset and secure-link code paths
- Business onboarding/claim/registration contracts
- Business posting and private CV/job-application contracts
- Business Copilot owner-review/no-auto-publish contract
- Opportunity Gap authentication/privacy-threshold contract
- Super Admin role-protected management contract
- PWA metadata, manifest and service-worker assets

## Production backend state checked

Production Supabase project: `bbfmrxefabmhtlshgemu`.

Critical RPCs, public views, business/post/job-application tables and AI opportunity table are present. The Edge Functions `histreets-ai`, `histreets-opportunity` and `histreets-admin-users` are deployed ACTIVE.

## Important production-data limitation

At the time of this verification, production contains no verified businesses and no live posts. Therefore production cannot yet demonstrate a real positive-result journey for resident AI, HiPulse activity, live offers/jobs/community results, Opportunity Gap, Business Copilot against a verified business, or a real job application. The empty states are valid; do not seed fake businesses/posts just to make the product look active.

## Manual production checks still required before claiming end-to-end operation

Use real, legitimate test data/accounts only:
1. Sign out, create/sign in to a real account, test password reset and secure email link delivery.
2. Approve/connect a legitimate test business, then verify it appears publicly.
3. Submit a real test offer/job/community item, verify moderation/publishing and resident discovery.
4. Run Ask HiStreets with a normal query after verified data exists and confirm a database-backed result.
5. Run a sensitive Ask HiStreets query and confirm the privacy fallback message.
6. Run Business Copilot for an approved owned business and confirm it produces a draft only.
7. Submit a test job application with a test CV and confirm owner/admin retrieval.
8. Verify HiPulse changes only from live public data and remains clearly labelled as HiStreets' own explainable indicator.

Passing automated tests plus ACTIVE backend functions is strong release evidence, but it is not a substitute for these real production interactions.
