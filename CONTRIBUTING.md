# Contributing to HiStreets

HiStreets is maintained as a product repository rather than a demo sandbox. Changes should preserve the Newham-only scope, privacy rules and release checks documented in the README.

## Working on a change

1. Create a focused branch from `main`.
2. Keep each commit about one understandable product or engineering change.
3. Add or update tests when behaviour changes.
4. Open a pull request describing the user problem, implementation, privacy/security impact and verification performed.
5. Do not merge while the release workflow is failing.

## Local checks

```bash
npm install
npm run test:unit
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

The browser suite intentionally covers mobile Chromium and WebKit because location, map interaction, PWA behaviour and mobile layout are core product paths.

## Product constraints

- Newham-only public scope unless a separate expansion is designed and reviewed.
- Do not add fake businesses, offers, jobs, community posts or parking data to production paths.
- Public businesses must come through the approved-business rules.
- Parking stays disabled until a reliable local data source is available.
- Do not expose Supabase service-role credentials, private CVs or verification evidence to the frontend.
- New analytics or intelligence features should explain their inputs and limitations and avoid unnecessary personal tracking.

## Pull request quality

A good HiStreets pull request should be small enough to review, explain why the change exists, identify any database or privacy impact and include evidence that the affected user flow works. Large unrelated clean-ups should be split from product features where practical.

Historical experiments remain visible in Git history. Repository maintenance should improve the current product tree rather than rewrite history to make development appear different from what actually happened.
