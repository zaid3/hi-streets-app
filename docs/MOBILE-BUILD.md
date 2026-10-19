# HiStreets mobile build

The native app packages the existing React interface locally with Capacitor 8. Live business listings, sign-in, uploads, map tiles and server functions use the existing production services. The package is `uk.histreets.app`; Android test builds use `.debug` to keep them separate. Android targets API 36, with minimum API 24. The iOS project requires a later Mac/Xcode build and signing.

Use Node 22+, JDK 21, Android SDK platform 36 and build tools 36.0.0. Run `npm ci` with the committed lockfile.

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
- Restore and complete account deletion, associated private-file cleanup, report/block tools, and posting terms enforcement. Earlier uncommitted drafts were lost during workspace maintenance; they are not part of this checkpoint and are not deployed.
- Publish accurate privacy, terms and external account-deletion pages, then verify the actual URLs and final data-safety answers.
- Test an ordinary account end to end, including email delivery/recovery, uploads/CVs, deletion, moderation, offline/relaunch and Android permission/back/keyboard behavior.
- Produce and inspect a signed AAB only after those checks. A passing web build or debug compilation is not a completed Play submission.

The developer account, store declarations and any required closed testing remain Play Console steps. Store approval cannot be guaranteed by a build.
