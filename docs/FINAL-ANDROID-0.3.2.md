# HiStreets Android 0.3.2 validation — 20 October 2026

Package: `uk.histreets.app`; versionCode: 3; minimum Android API 24; target API 36.
The owner supplied the original upload key, whose SHA-256 certificate fingerprint is
`D6:3F:BF:2B:70:40:0D:72:38:C1:0B:3A:E5:FA:08:31:86:F1:6D:B4:A1:A6:BF:D1:CF:FE:36:49:8C:2C:CC:30`.
Signing files are kept outside Git and outside application assets.

## Completed checks

- 77 source/unit tests passed; TypeScript and Vite production build passed.
- Capacitor Android assets synced with a live public backend configuration;
  release marker is configured=true, preview=false.
- Cloudflare provider response was verified separately against the deployed function:
  HTTP 200 and cloudflare_intent. Authenticated business drafting is not yet tested.

## Limitations and remaining gates

- A new Chromium browser download returned an unavailable-site response. Browser
  tests could not launch; those failures are environment failures, not passes.
- This session has no Android emulator or hardware acceleration. The signed release
  has not been exercised on a device with an ordinary authenticated business account.
- Policy URL checks from this environment returned HTTP 403, Cloudflare error 1010.
  This does not establish that the pages fail for ordinary visitors; the owner must
  verify the privacy and deletion pages are publicly accessible and up to date.
- Google Play pre-launch testing, app-access credentials, Data safety declarations,
  account verification and any required closed testing remain owner/Play steps.
- This report does not certify legal compliance or guarantee Play approval.

## Native artifact results

Gradle assembleRelease, bundleRelease and testReleaseUnitTest completed successfully.
The native unit-test targets reported NO-SOURCE; they are not counted as executed tests.
Release vital lint checks completed without blocking errors. APK v2 signature verifies;
AAB JAR signature verifies and the certificate matches the original upload key.
Jarsigner warns about the self-signed certificate, no timestamp, and ZIP manifest ordering;
bundletool 1.18.1 validates the bundle successfully.
Both archives pass integrity checks, contain production configuration and Cloudflare
privacy disclosures, and contain neither the upload password nor private signing files.

APK SHA-256: b9215455d6a551296790eb2874e2e5089a041c0f3d478378f70df6ec4a94a568
AAB SHA-256: 73ea257472199c9b3b4dff550bdffc3ba79cc949bf92b35dadb2ae1d6bc9387a

Source checkpoint recorded for these artifacts: `b3ce811`.

This is a dated artifact record. Later shared-app changes add explicit AI-sharing
consent and in-app account-deletion requests; the hashes above do not identify a
build containing those changes. See [MOBILE-BUILD.md](MOBILE-BUILD.md) for the
current source and CI status, and produce a new signed release before distributing
new functionality.
