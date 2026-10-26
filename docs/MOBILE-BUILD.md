# HiStreets mobile build

Source status: 26 October 2026. The native apps bundle the existing React interface locally with Capacitor 8.5.3. Business listings, authentication, uploads, map tiles and server functions use the configured online services.

| Platform | Identifier | Current source version | Build requirements |
| --- | --- | --- | --- |
| Android | `uk.histreets.app` | 0.3.2, versionCode 3 | Node 22+, JDK 21, Android SDK 36, build tools 35.0.0 and 36.0.0 |
| iOS/iPadOS | `uk.histreets.app` | 0.3.2, build 1 | Node 22+, Mac and Xcode 26.3 as used in CI |

Android targets API 36 with API 24 as the minimum. The iOS minimum is 15. Android test builds use a `.debug` application ID suffix. Use `npm ci` with the committed lockfile.

## Public backend configuration

The live web bundle identifies `https://bbfmrxefabmhtlshgemu.supabase.co` as the HiStreets backend. Put its current **public publishable key** in an ignored `.env.production.local`:

```dotenv
VITE_SUPABASE_URL=https://bbfmrxefabmhtlshgemu.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Never use a secret or service-role key in the frontend. A public key does not grant administrator access; database and storage policies enforce permissions. Keep signing files and credentials outside Git and application assets.

Native CI uses `android/app/src/androidTest/assets/live-backend-public.json`, containing the intentionally public frontend configuration. The preparation script rejects privileged keys. The exact historical Gitleaks finding for this public key is recorded in `.gitleaksignore`; there is no whole-file or general key-pattern exclusion. Future changes remain scanned.

## Build commands

```sh
npm ci
npm run check
npm run mobile:sync
npm run mobile:android
```

`mobile:sync` validates public configuration, builds the web assets and syncs the native projects. From `android`, run `./gradlew assembleDebug` for device testing. A debug APK is not a store release.

For iOS preparation only:

```sh
npm run test:ios-guard
npm run ios:sync
npm run ios:verify
npm run mobile:ios
```

The shared `App` scheme supports an unsigned Release archive and native navigation tests. The Xcode Release guard rejects preview, missing, incomplete, remotely hosted or debug-enabled bundles. `npm run mobile:preview` is for isolated UI development; do not distribute a preview bundle.

Use the original Android upload key for a signed AAB and keep the key/password private and backed up. Increase versionCode for each new Play upload. Apple distribution requires the owner's team, signing and a new build number for each subsequent upload. See [Play submission](PLAY-SUBMISSION.md) and [iOS submission](IOS-SUBMISSION.md).

## Native behaviour

Location is requested only when the user chooses it. Approximate location is accepted and there is no background tracking. Back closes the active dialog before navigating or exiting. External websites and temporary private-document links use the native browser; telephone and email links use OS handlers. The native bundle does not register the website's service worker.

Confirmation and recovery destinations are `https://app.histreets.uk/business` and `https://app.histreets.uk/business?mode=recovery`. Verify them against Supabase redirect settings and email templates. Password reset completes in the browser, after which the user returns to the app to sign in. Custom authentication deep links are not configured.

The shared interface now requires separate opt-ins for resident AI questions and business drafts. It also includes authenticated account-deletion requests, persisted status and a private founder queue. Requests are processed manually under [the deletion procedure](ACCOUNT-DELETION-OPERATIONS.md); the intake itself does not remove accounts or send email.

## Backend and provider records

Native origins are included in the source allowlists for `histreets-ai`, `histreets-opportunity`, `histreets-team` and `histreets-admin-users`. Team/admin services preserve JWT verification. The public resident AI route performs its own origin checks, and business drafting also checks authentication, ownership and verification.

On 20 October 2026, Cloudflare Workers AI replaced the earlier Gemini integration. A synthetic resident search through deployed `histreets-ai` version 11 returned HTTP 200 with `cloudflare_intent`. Unauthenticated drafting returned 401 and an untrusted origin returned 403. These are dated observations; authenticated provider drafting and the current account's plan need separate verification. See [FREE-AI-SETUP.md](FREE-AI-SETUP.md).

The reporting migration and native-origin updates were recorded as deployed on 20 October. The account-deletion request migration was applied on 26 October, with row-level security and column grants checked. Source changes to a client do not establish that a website or previously signed binary has been updated.

## Verified source checkpoint

At [ba762da](https://github.com/zaid3/hi-streets-app/commit/ba762da04eabe96d34ac820c2869eab046b6350c), the following CI checks passed on 26 October 2026:

- [Security and release](https://github.com/zaid3/hi-streets-app/actions/runs/40366733840): 81 source/unit tests, TypeScript, Vite, dependency audit and secret scanning; 21 account-deletion database checks; 48 account/consent/deletion browser cases; 75 general browser cases with 14 skipped; 8 HiPulse and 4 content-safety cases.
- [Android build and native tests](https://github.com/zaid3/hi-streets-app/actions/runs/40366733827): production-configured debug build and installed WebView checks.
- [iOS build and simulator tests](https://github.com/zaid3/hi-streets-app/actions/runs/40366734023): 8 release-guard checks, an unsigned device archive and native navigation tests on iPhone and iPad.

Installed public-backend checks use the `businesses_geojson` RPC, denied private report reads, invalid report rejection and Auth settings. They do not create users, submit reports, send email or invoke AI. Browser account tests use controlled fixtures. These checks do not replace ordinary-account testing on a signed release.

## Signed Android artifacts and historical checks

The [Android 0.3.2 validation record](FINAL-ANDROID-0.3.2.md) documents the signed APK/AAB produced on 20 October, including their hashes and Cloudflare disclosures. They predate the current explicit AI-consent and account-deletion request flows. Build a new signed package from the selected release commit before distributing those changes.

The earlier 0.3.1 artifacts (versionCode 2) were built from `d2d1bdd`. That checkpoint recorded 72 unit checks, 22 reporting database checks, 24 feedback checks, 86 email-queue checks, 40 Chromium checks, 27 account/feedback checks and 4 safety checks. CI passed at `bf2a4ae`. Those dated results do not validate later source or binaries.

## Remaining publication work

Test ordinary-account sign-in, confirmation/recovery, private uploads, reporting, AI consent, provider drafting, deletion requests and sign-out in the installed release. Verify the public support/policy pages and the operator's moderation and deletion process.

Complete store declarations, reviewer access, screenshots, physical-device checks and the applicable store review/testing process. Apple account setup, signing and upload remain pending. No signed iOS package or store publication is established by the unsigned CI archive.
