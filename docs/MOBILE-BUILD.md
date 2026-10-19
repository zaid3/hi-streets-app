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

Run `npm run check`, then `npm run mobile:sync`. This validates public configuration, builds the web assets and copies them into the native projects. It is a configuration check, not proof that server features or store requirements pass.

From `android`, run `./gradlew assembleDebug` for device testing. The debug APK is not a store release. `npm run mobile:preview` is only for isolated UI/CI checks; release builds reject its marker. Do not bypass the release guard.

Use Android Studio's Generate Signed App Bundle flow with the owner's upload key after the release gates pass. Keep the keystore/password outside Git, use Play App Signing, and increase versionCode for each upload. iOS requires a Mac, the owner's Apple team and device/TestFlight validation.

## Native behavior

Location is requested only when the user chooses it; approximate location is accepted and no background tracking is enabled. Back closes the active dialog before navigating or exiting. External websites and temporary private-document links use the native browser. Telephone/email links use OS handlers. The native bundle does not register the website's service worker.

Native confirmation/recovery destinations are `https://app.histreets.uk/business` and `https://app.histreets.uk/business?mode=recovery`. Verify these destinations and email templates in Supabase. A password reset completes in the browser; the person returns to the app to sign in. Custom auth deep links are not configured.

## Production deployment approval

Only the source allowlists of the existing `histreets-ai`, `histreets-opportunity`, `histreets-team` and `histreets-admin-users` functions change: they add `https://localhost` and `capacitor://localhost`. Authentication, platform roles, prompt handling and providers remain unchanged. An automated comparison checks that removal of these two additions gives the original function source.

These changes are **not deployed**. Automatic approval review rejected replacement of the live AI function and requires explicit permission before another deployment attempt. Review this exact patch before authorizing deployment. Do not bypass the rejection through another deployment route.

## Release gates still open

- Deploy the approved native-origin changes and test real native server calls.
- Deploy the approved content-reporting migration. Reports, blocking, signup/posting terms and a support-based deletion-request path are implemented and tested locally; the operator must fulfil deletions using docs/ACCOUNT-DELETION-OPERATIONS.md.
- Publish accurate privacy, terms and external account-deletion pages, then verify the actual URLs and final data-safety answers.
- Test an ordinary account end to end, including email delivery/recovery, uploads/CVs, deletion, moderation, offline/relaunch and Android permission/back/keyboard behavior.
- Inspect the signed AAB and APK, then complete the live account and deployment checks before production submission. A signed build is not a completed Play submission.

The developer account, store declarations and any required closed testing remain Play Console steps. Store approval cannot be guaranteed by a build.

## Resumed 19 October 2026

The prior Android compilation and Security and release workflows passed at commit 59af399. New source adds in-app reports for public posts, business listings and AI responses; persistent device-local business blocking; moderator review/removal; signup/posting rule acceptance; a prominent deletion-request path; and revised privacy/terms/deletion pages. Account/data deletion is a documented, manually processed support request, not an automatic database deletion. The operator must actually fulfil requests, including private Storage files and provider-held data.

The new content_reports migration was tested with 22 checks in isolated PostgreSQL. Automatic approval review rejected applying it to production, requiring explicit owner approval for its table, functions and anti-republication triggers. It has NOT been deployed. The earlier native-origin function deployment is also still blocked pending explicit approval. Do not retry either production mutation without that approval.

Browser testing: 36 existing mobile checks passed (3 desktop-only skips), all 72 unit checks passed, and four new reporting/blocking/deletion/accessibility browser tests passed after fixing report-dialog focus restoration. Production dependency audit found no vulnerabilities. These results are not a substitute for authenticated native-device testing.

The Supabase CLI created the new migration filename before automatic approval blocked its telemetry attempt. No further CLI telemetry attempt was made. Local SQL tests use PGlite without network access.
