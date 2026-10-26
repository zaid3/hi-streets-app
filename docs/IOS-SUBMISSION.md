# HiStreets for iPhone and iPad

Bundle ID: `uk.histreets.app`. Version: **0.3.2**, first iOS build: **1**.
Minimum OS: iOS/iPadOS 15. The existing React app is bundled locally using
Capacitor 8.5.3 and Swift Package Manager. The existing 1024px app icon is opaque.
Location is optional and foreground-only. The public directory works without an
account; sign-in is for business and administration features.

## Build and test

Use Node 22+ and a Mac with Xcode 26.3 (the version selected by CI). Apple's
[current minimum upload requirement](https://developer.apple.com/news/upcoming-requirements/?id=04282026a)
is Xcode 26+ with the iOS 26 SDK. Check this again before a later submission.

```sh
npm ci
npm run check
npm run test:ios-guard
npm run ios:sync
npm run ios:verify
npm run mobile:ios
```

`ios:sync` reads the existing public backend configuration from the ignored
`.env.production.local` described in [MOBILE-BUILD.md](MOBILE-BUILD.md). It builds
and syncs **only iOS**. Never put a service-role key or Apple signing credentials
in that file, Git, or app resources.

The shared `App` scheme includes native UI tests. The `iOS build and simulator
tests` workflow builds an unsigned device archive and runs navigation tests on
an iPhone and iPad with Xcode 26.3. It retains logs, screenshots and `.xcresult`
bundles. Its public backend settings come from the already committed native-test
configuration. Tests browse public screens only; they do not create accounts,
submit reports, send emails, upload files or invoke AI.

The Xcode Release build phase rejects missing, preview, incomplete, debug-enabled
or remotely hosted app bundles. `npm run mobile:preview -- --platform ios` is for
UI development and must not be used for distribution. An unsigned archive is
build verification, not an installable TestFlight or App Store package.

## Owner's Apple account and TestFlight

1. Use the owner's Apple Developer membership and register `uk.histreets.app`.
2. Create the HiStreets iOS app in App Store Connect with that bundle ID.
3. In Xcode, select the `App` target, choose the owner's team and enable automatic
   signing. Keep signing material out of Git. Increase `CURRENT_PROJECT_VERSION`
   for each subsequent upload; set `MARKETING_VERSION` in both app configurations
   when the public version changes.
4. Select the shared `App` scheme and a generic iOS device, then Product > Archive.
   Validate and distribute the signed archive through App Store Connect.
5. Install through TestFlight on a physical iPhone and iPad. Check location denied
   and approximate modes, map/list fallback, keyboard and landscape layout,
   sign-in/confirmation/recovery, camera/photo/document selection, private uploads,
   reporting/blocking, AI consent, account deletion and sign-out with an ordinary
   account. Provide Apple a non-admin review account with appropriate test data.

No Apple team, distribution certificate, provisioning profile, App Store Connect
record or signed iOS upload has been established by this source change.

## App Review issues found in the current shared app

These must be resolved and verified before submitting for public App Review:

- **Account deletion:** the app now submits an authenticated request directly and
  shows the saved status. The private founder queue and row-level policies are
  included in `20261026142746_account_deletion_requests.sql`. Apply and verify
  this migration before shipping the frontend. The owner must monitor the queue
  daily, complete the existing removal procedure within the displayed 30-day
  target, and confirm completion. Test the flow with a designated test account.
  The intake does not itself erase data or send a confirmation email.
  [Apple account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion).
- **AI sharing:** resident questions now require an affirmative checkbox before
  any AI request; business drafting has a separate opt-in covering instructions
  and the selected business profile. Declining keeps ordinary search and manual
  posting available. The shared API client rejects calls without affirmative
  consent. Verify these controls in the signed app as well as mocked browser tests.
  [App Review Guideline 5.1.2(i)](https://developer.apple.com/app-store/review/guidelines/#data-use-and-sharing).
- **Privacy:** verify the live policy and support pages, operator details, actual
  backend processing and App Store privacy answers. The app collects data through
  accounts, business submissions, job applications, reports and feedback. An empty
  SDK privacy manifest does not mean that the app collects no data. Review the
  privacy report generated from the signed archive, including all SDK manifests.
- **Store listing:** enter the actual age-rating, distribution, content-rights and
  privacy answers; supply real iPhone/iPad screenshots and review contact details.
  Screenshot attachments from automated tests are verification evidence and need
  review before being used as storefront images.

The app currently uses its own email/password and email-code login. No social
login or Sign in with Apple has been added. The encryption declaration is set to
`ITSAppUsesNonExemptEncryption = NO` for the current app's standard HTTPS/auth
cryptography; reassess it if encryption functionality changes.

## Store listing draft

**Name:** HiStreets

**Subtitle:** Newham businesses and offers

**Description:**

Discover businesses, offers, jobs and community support around Newham.

Explore the local map, search by service or postcode, and see business names and
available offers together. You can browse without creating an account and choose
whether to share your location to find places nearby.

Business owners can register or claim a listing, manage their profile and share
local updates through a HiStreets account. Available features and content depend
on business verification and current local listings.

**Privacy URL:** https://app.histreets.uk/privacy.html

**Support website:** https://histreets.uk/

Confirm that both URLs work publicly and that the support page provides a clear
contact method before entering them in App Store Connect. No payment, popularity
or availability claims have been added to this draft.
