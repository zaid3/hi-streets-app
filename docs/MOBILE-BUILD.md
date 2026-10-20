# HiStreets mobile build

The native app packages the existing React interface locally with Capacitor 8. Live business listings, sign-in, uploads, map tiles and server functions use the existing production services. The package is `uk.histreets.app`; Android test builds use `.debug` to keep them separate. Android targets API 36, with minimum API 24. The iOS project requires a later Mac/Xcode build and signing.

Use Node 22+, JDK 21, Android SDK platform 36 and build tools 35.0.0 and 36.0.0. Run `npm ci` with the committed lockfile.

## Public backend configuration

The live app bundle identifies `https://bbfmrxefabmhtlshgemu.supabase.co` as the HiStreets backend. Use its current **public publishable key** in an ignored `.env.production.local`:

```dotenv
VITE_SUPABASE_URL=https://bbfmrxefabmhtlshgemu.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Never use a secret or service-role key in the frontend. A public key does not grant administrator access; database and storage policies enforce permissions. This repository deliberately contains no local credentials or signing keys.

Native CI now reads `android/app/src/androidTest/assets/live-backend-public.json`, containing the same intentionally public frontend configuration as the deployed app. `prepare-mobile-live-test.mjs` rejects privileged keys before building. The exact historical Gitleaks finding for this public key is recorded in `.gitleaksignore`; no whole-file or general key-pattern exclusion is used. Future changes are still scanned. Installed WebView tests verify public map listings through `businesses_geojson`, denied private report reads, invalid report rejection and Auth settings without creating users, submitting reports, sending email or invoking AI. The restricted `businesses_public` view can legitimately return no rows for anonymous visitors; the map uses the public RPC instead. These checks do not establish successful account sign-in or private uploads.

Run `npm run check`, then `npm run mobile:sync`. This validates public configuration, builds the web assets and copies them into the native projects. It is a configuration check, not proof that server features or store requirements pass.

From `android`, run `./gradlew assembleDebug` for device testing. The debug APK is not a store release. `npm run mobile:preview` is only for isolated UI/CI checks; release builds reject its marker. Do not bypass the release guard.

Use Android Studio's Generate Signed App Bundle flow with the owner's upload key after the release gates pass. Keep the keystore/password outside Git, use Play App Signing, and increase versionCode for each upload. iOS requires a Mac, the owner's Apple team and device/TestFlight validation.

## Native behavior

Location is requested only when the user chooses it; approximate location is accepted and no background tracking is enabled. Back closes the active dialog before navigating or exiting. External websites and temporary private-document links use the native browser. Telephone/email links use OS handlers. The native bundle does not register the website's service worker.

Native confirmation/recovery destinations are `https://app.histreets.uk/business` and `https://app.histreets.uk/business?mode=recovery`. Verify these destinations and email templates in Supabase. A password reset completes in the browser; the person returns to the app to sign in. Custom auth deep links are not configured.

## Production state on 20 October 2026

Only the source allowlists of the existing `histreets-ai`, `histreets-opportunity`, `histreets-team` and `histreets-admin-users` functions change: they add `https://localhost` and `capacitor://localhost`. Authentication, platform roles, prompt handling and providers remain unchanged. An automated comparison checks that removal of these two additions gives the original function source.

Native origins are deployed for `histreets-opportunity` v3, `histreets-team` v2 and `histreets-admin-users` v3. JWT verification is preserved for team/admin services. The content-reporting migration is deployed, with RLS enabled and anonymous report reads/moderation denied. Privacy, terms and deletion pages were verified live.

The native-origin change for `histreets-ai` is **not deployed**; live v5 still has the previous allowlist. Automatic approval review rejected that deployment because it enables Android prompts to reach Google Gemini and required explicit approval. Do not bypass this rejection through another deployment route.

The owner requests retaining Gemini AI and using only the free tier. No billing setting or AI provider has been changed. Google's [Gemini API terms](https://ai.google.dev/gemini-api/terms), checked on 20 October 2026, require Paid Services for API clients offered to UK users; Gemini API access is a Paid Service when its Cloud Project has an active billing account. The free-only public-release decision remains unresolved. Do not enable billing or replace the provider without authorization.

## Release gates still open

- Resolve the AI service/tier decision, obtain approval for the outstanding AI deployment and verify native AI responses.
- Test an ordinary account in the installed production app, including sign-in/recovery, private uploads, reporting and sign-out. The operator must fulfil deletion requests using docs/ACCOUNT-DELETION-OPERATIONS.md.
- Complete Play Console declarations, internal testing/pre-launch review and any applicable account testing requirements before public rollout.

The developer account, store declarations and any required closed testing remain Play Console steps. Store approval cannot be guaranteed by a build.

## Validation and signed artifacts

Version 0.3.1 (versionCode 2) APK/AAB were built and signed from `d2d1bdd` using the existing upload key. Signature and bundle validation passed, with no lint errors and 26 warnings. Both include production backend configuration; neither includes a service-role key or signing credentials. Later PR commits add tests and documentation only, so those binaries remain unchanged.

Local validation passed: 72 unit checks, 22 reporting database checks, 24 feedback database checks, 86 email-queue checks, 40 Chromium browser checks, 27 mocked-auth/feedback checks and four reporting/safety browser checks. Security and release CI passed on `bf2a4ae`, including Chromium and WebKit. Prior native preview tests passed on `d2d1bdd`.

The production-configured native test initially asserted that the restricted business view must be nonempty. This was a test error: the app's map uses `businesses_geojson`. The corrected test follows that RPC; consult the PR's Android workflow for its result. A direct public-endpoint check returned 3,454 map features, denied anonymous report reads (401), rejected an invalid report (400), and exposed Auth settings successfully (200). These results are not a substitute for authenticated installed-app testing or Play pre-launch review.
