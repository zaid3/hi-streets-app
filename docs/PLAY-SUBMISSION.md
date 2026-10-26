# HiStreets Google Play submission

Package: `uk.histreets.app`. Current source version: **0.3.2**, versionCode **3**. Android API 36 target, Android 7/API 24 minimum. App name: HiStreets. Proposed category: Lifestyle. No ads or in-app payments are implemented.

The [20 October artifact record](FINAL-ANDROID-0.3.2.md) covers signed APK/AAB files produced before the current AI-sharing consent and in-app deletion-request changes. Build from the selected release commit and increase versionCode for a subsequent Play upload. The owner uploads through their Play Console account. See [MOBILE-BUILD.md](MOBILE-BUILD.md) for source validation and remaining device checks.

## Store copy

Short description (under 80 characters):

Discover Newham businesses, local offers, jobs and community support.

Full description:

HiStreets brings Newham's local businesses and community opportunities together on one map.

Explore business listings, find local offers and jobs, and discover community activities. Browse without creating an account. Choose whether to use your location to see what is nearby.

Business owners can register or claim a listing, manage business information, publish local updates and receive job applications, subject to verification and access controls. Optional AI assistance can help interpret a search or draft a business post after permission to share the input. Owners review drafts before publishing.

Report content that needs attention, hide a business on your device, and request account deletion from the Business area. Deletion requests are processed by the operator.

Coverage currently focuses on the London Borough of Newham. Available listings and posts change over time. Parking information is not yet available.

Support email: ahaque@atomicmail.io

Website: https://histreets.uk/

Privacy URL: https://app.histreets.uk/privacy.html

Deletion URL: https://app.histreets.uk/delete-account.html

The policy pages were recorded as live on 20 October 2026. Recheck public availability and current content when submitting; source files are in `public/`.

## Data safety review

Complete the Play form from actual behaviour, including server processing. Account details, public business information/posts/images, applications and CVs, reports, feedback, optional AI search/draft inputs, business interaction events and derived abuse-limit identifiers are processed. Location is optional and used for nearby results; map tile requests can reveal the viewed area. The Android package has no Google Analytics or advertising SDK.

Review each applicable form category: personal information (name, email, phone, account ID, address), location, files/documents, photos, user-generated content, search inputs/app interactions and security identifiers. Required or optional collection depends on the feature. Data is transmitted over HTTPS. Signed-in users can submit an account-deletion request directly; support is also available. Requests are processed manually under [ACCOUNT-DELETION-OPERATIONS.md](ACCOUNT-DELETION-OPERATIONS.md).

Do not automatically answer "no data shared": job applications go to the selected business, public posts are public, and optional AI uses Cloudflare Workers AI after configuration and explicit consent. Confirm actual account data controls and applicable service-provider exemptions before answering. Retention and processing answers must match the deployed service and provider settings.

## Release steps

1. Select the release commit and verify the backend migrations, native origins and public policy pages. Check [FREE-AI-SETUP.md](FREE-AI-SETUP.md) for the Cloudflare configuration and dated provider result.
2. Confirm that the Cloudflare account uses the intended free plan and server-side credentials. Test a permitted resident search and an authenticated verified-owner draft. A local fallback is not proof of external AI processing. Verify that declining AI sharing leaves ordinary search and manual posting usable.
3. Build a fresh signed release with the original upload key. Keep the key/password private and backed up. Check the release marker and bundled policy text; do not upload preview assets or reuse an already uploaded versionCode.
4. Exercise ordinary-account sign-in, email confirmation/recovery, private uploads, reporting, deletion requests and sign-out on the installed release. Verify moderation and deletion handling with designated test accounts.
5. Use Play App Signing, upload to Internal testing and review the pre-launch results. Complete developer verification, app access, content rating, target audience, Data safety, privacy/deletion links and listing screenshots. Provide reviewer credentials privately through Play Console.
6. Check the testing and production-access requirements displayed for the developer account before public rollout. Google's review controls public availability.

## Official submission references

These official pages were checked on 26 October 2026. Recheck the instructions and the requirements shown in Play Console before a later upload.

- [Testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Control when changes are reviewed and published](https://support.google.com/googleplay/android-developer/answer/9859654)
- [User-generated content policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)

A signed AAB and passing CI are build and test records. They do not establish completion of ordinary-account device testing, operational deletion, declarations or Play review.
