# HiStreets Google Play submission

Package: uk.histreets.app. Current signed release versionCode 2, versionName 0.3.1. Android API 36 target, Android 7/API24 minimum. App name: HiStreets. Category: Lifestyle. No ads or in-app payments are implemented.

The owner will upload the AAB through their own Play Console account. No Console sign-in or upload by the assistant is required. See docs/MOBILE-BUILD.md for recorded validation and remaining gates. This document does not certify production readiness.

## Store copy

Short description (under 80 characters):
Discover Newham businesses, local offers, jobs and community support.

Full description:
HiStreets brings Newham's local businesses and community opportunities together on one map.

Explore business listings, find local offers and jobs, and discover community activities. Browse without creating an account. Choose whether to use your location to see what is nearby.

Business owners can register or claim a listing, manage business information, publish local updates and receive job applications. AI assistance can help interpret a search or draft a business post; owners review drafts before publishing.

Report content that needs attention, block a business on your device, and access account/data deletion support from the Business area.

Coverage currently focuses on the London Borough of Newham. Available listings and posts change over time. Parking information is not yet available.

Support email: ahaque@atomicmail.io
Website: https://histreets.uk/
Privacy URL: https://app.histreets.uk/privacy.html
Deletion URL: https://app.histreets.uk/delete-account.html
These pages were recorded as live on 20 October 2026; recheck availability when submitting. Source files are in public/.

## Data safety review

Complete the Play form from actual behaviour, including server processing. Account details, public business information/posts/images, applications and CVs, reports, AI search/draft inputs, business interaction events and derived abuse-limit identifiers are processed. Location is optional and used for nearby results; map tile requests can reveal the viewed area. The Android package has no Google Analytics or advertising SDK.

Review each applicable form category: personal information (name, email, phone, account ID, address), location, files/documents, photos, user-generated content, search inputs/app interactions and security identifiers. Required/optional collection depends on the feature. Data is transmitted over HTTPS. Account and data deletion is requested through support and then processed manually.

Do not automatically answer "no data shared": job applications go to the selected business, public posts are public, and optional AI uses Cloudflare Workers AI after configuration. Confirm the actual account data controls and applicable service-provider exemptions before answering. Do not assert ephemeral processing or a retention period unless it matches actual service settings.

## Release steps

1. The native-origin function patches and reporting migration were deployed and checked on 20 October 2026. The subsequent provider replacement removes all Gemini calls and uses Cloudflare Workers AI with local fallbacks. Follow docs/FREE-AI-SETUP.md for activation and verification.
2. Keep the Cloudflare account on Workers Free and configure its server-side token and Account ID. Use direct standard inference without AI Gateway logging or stateful AI features. Verify a successful live AI response rather than counting a fallback as an AI pass. Publish the updated Cloudflare Workers AI disclosures and rebuild Android: the existing signed 0.3.1 package still names Gemini. Verify the policy URLs load without sign-in.
3. Complete an ordinary account's native sign-in, email confirmation/recovery, private upload, reporting and sign-out tests. Review deletion operations and moderation access.
4. Keep the upload key/password private and backed up. Enable Play App Signing. Upload the signed AAB to Internal testing first and review Google's pre-launch results.
5. Complete developer verification, app access instructions, content rating, target audience, Data safety, privacy/deletion links and listing screenshots. Supply a working reviewer account for restricted business/admin features through Play Console, not a public repository.
6. Personal developer accounts created after 13 November 2023 must complete a closed test with at least 12 opted-in testers for 14 consecutive days before applying for production access. Google's review controls public availability.

References checked 19 October 2026:
https://support.google.com/googleplay/android-developer/answer/14151465
https://support.google.com/googleplay/android-developer/answer/9876937
https://support.google.com/googleplay/android-developer/answer/13327111
https://support.google.com/googleplay/android-developer/answer/9859654

A signed AAB alone does not demonstrate that owner-operated deletion, authenticated device flows, successful Cloudflare Workers AI responses or Play's review have passed. The recorded emulator tests used a production-configured debug build; they do not replace signed-in testing of the installed release APK.

Gemini terms checked 20 October 2026:
https://ai.google.dev/gemini-api/terms
