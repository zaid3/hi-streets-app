# HiStreets

**Helping local businesses grow with technology.**

HiStreets brings Newham's businesses, offers, jobs and community support into one local map and a set of simple feeds. Residents can discover what is nearby without creating an account. Local business teams can manage their presence, publish opportunities and receive job applications through a shared workspace.

**Created and maintained by Ahtashamul Haque.**

[Website](https://histreets.uk/) · [Web app](https://app.histreets.uk/) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

## Why HiStreets exists

A useful local offer may only reach a shop's existing followers. A weekend vacancy may stay in a window. Community support may be available a few streets away from someone who does not know it exists.

HiStreets connects these everyday opportunities with the places where they are available. The aim is to help small organisations reach nearby people without needing their own digital marketing, recruitment or technology team. Newham is the starting point; wider coverage is future work.

## What the product does

### Local discovery

The map supports business and service searches, streets, full postcodes, outward postcodes and optional user-initiated location. Category markers identify business locations; activity badges indicate an available offer, job or community post. Tapping a business opens its name, details and available posts. Dedicated Offers, Jobs and Community feeds provide another way to browse.

Public map listings may be unclaimed. Being on the map does not establish that a business has a verified owner, uses the workspace or is a customer. Ownership verification and permission to publish are separate controls.

### Offers, jobs and community support

Verified businesses can publish structured offers, vacancies, free meals and community-support posts. Job posts can include pay, hours, location and application requirements. Residents can apply without a resident account. CVs remain in private storage and are opened by the relevant business or authorised administrator through temporary links.

### Business workspace

Owners can claim an existing listing or register a business, submit private verification evidence, manage their profile and publish posts after verification. The workspace also provides job applications, team invitations and roles, interaction analytics and feedback. Returning owners can go directly to management.

Business owners and platform administrators use the same sign-in page. Stored roles, ownership checks and database policies determine access. Super Admin tools include ownership review, user management, moderation and the private account-deletion request queue.

### Optional AI assistance

Ask HiStreets interprets a resident's request and returns results from the local database. Ordinary search and postcode matching also work without external AI. Business Copilot turns an owner's description into an editable offer or job draft; the owner reviews it and chooses whether to publish.

Resident questions and business drafts each require an explicit opt-in before being sent for AI processing. The current integration uses Cloudflare Workers AI through server-side functions. Provider errors and quotas use local fallbacks; a fallback is not evidence of a successful AI response. Provider keys stay on the server.

### HiPulse

HiPulse is an explainable score from 0 to 100 based on current activity, category diversity, map coverage and balance across offers, jobs and community posts. Each factor is visible and links back to the relevant posts or map. The calculation is deterministic and does not require an AI provider or a personal search history.

The four capped contributions are activity (40 points), diversity (20), coverage (20) and balance (20). A directory with no live posts can still receive coverage and diversity points. HiPulse describes the app's data; it is not an official Newham statistic, economic forecast or measure of customer adoption. See [the model and limitations](docs/hipulse.md).

### Opportunity Gap

Verified owners can view a signal when at least five recorded searches match their business category and postcode area within seven days. The function compares the aggregate count with current offers in that area and can lead into an owner-reviewed Copilot draft.

The threshold counts signals, not unique people. The offer count covers the area rather than establishing an exact match for each need. Raw search text is not stored in the aggregate signal table, and sensitive-term filtering excludes some inputs. This is an exploratory business prompt, not proof of unmet demand, anonymity or future sales. See [the implementation notes](docs/local-intelligence-engine.md).

### Mobile experience

The same React interface runs on the web and in locally bundled Android and iOS apps. Five primary destinations keep the main tasks within reach: Map, Offers, Jobs, Community and Business. Location is optional, business details open from the map, and a directory fallback remains available when WebGL is unavailable.

**Parking section kept as coming soon** until authoritative local data is available. Messaging-based publishing and coverage beyond Newham are future work.

## Product design and innovation

HiStreets connects discovery with action: a resident finds a local opportunity, a business publishes or updates it, and visible activity feeds back into the map and HiPulse. Opportunity Gap and Copilot provide a separate path from aggregate search signals to an owner-reviewed post.

The product contribution is how these workflows fit together for local businesses and communities. The implementation uses established open-source technologies. It does not claim to be the first or only product with these individual features.

| Design choice | Purpose | Implementation |
| --- | --- | --- |
| Business locations with activity badges and detail sheets | Keep an opportunity connected to where it is available | [MapView](src/components/MapView.tsx), [BusinessDetailSheet](src/components/BusinessDetailSheet.tsx) |
| Plain-language and postcode search before optional AI | Make everyday discovery usable without an external AI call | [smartSearch](src/lib/smartSearch.ts), [SmartMapSearch](src/components/SmartMapSearch.tsx) |
| Structured posts and owner-reviewed drafts | Help small teams publish useful details while retaining control | [PostComposer](src/components/PostComposer.tsx), [AI handler](supabase/functions/histreets-ai/index.ts) |
| Visible HiPulse factors with links to source data | Let people inspect what contributes to the score | [Scoring function](src/lib/hiPulse.ts), [HiPulse interface](src/components/HiPulse.tsx) |
| Thresholded category and postcode-area signals | Give verified owners a limited indication of local search activity | [Opportunity function](supabase/functions/histreets-opportunity/index.ts) |
| Separate listing, verification and team permissions | Support public discovery without granting ownership or publishing access | [Ownership](src/lib/ownership.ts), [Workspaces](src/lib/workspaces.ts), [Migrations](supabase/migrations) |

See [the product vision and implementation record](docs/product-vision.md) for the problem, design decisions and development scope. Features, directory coverage, user engagement and real-world outcomes are different measures; source code alone does not demonstrate increased sales or employment.

## Trust and privacy

- Public resident browsing does not require an account.
- Business registration and map flows enforce the supported Newham area.
- Job CVs and business-verification evidence use private storage and authorised access.
- Protected operations rely on server and database checks as well as the interface.
- AI sharing requires an explicit choice; manual search and posting remain available.
- Content can be reported, and a business can be hidden on the user's device.
- Signed-in users can submit an account-deletion request and see its saved status. The operator processes it manually, with a stated 30-day target; the request does not instantly erase data or send an email.
- **No fake businesses, jobs, offers, meals or parking** are added to production flows.
- There is no active public review or rating system in this release.

The app's [privacy policy](public/privacy.html), [terms](public/terms.html) and [deletion information](public/delete-account.html) describe user-facing behaviour. Operators should follow the [deletion procedure](docs/ACCOUNT-DELETION-OPERATIONS.md) and review the [AI setup and provider disclosures](docs/FREE-AI-SETUP.md).

## Account access

New users create an account with email and password and confirm their email when required. Returning users can sign in with a password or request an email code for an existing account. The code length follows the Supabase setting, from 6 to 10 digits. Password creation and reset require at least 12 characters in the frontend.

Password recovery uses a secure email link. Native recovery currently finishes in the browser, after which the user returns to the app to sign in. Custom authentication deep links are not configured.

## Repository layout

The current application starts at [src/main.tsx](src/main.tsx) and uses React 18, TypeScript and Vite. MapLibre provides the map. Supabase supplies Auth, Postgres/PostGIS, private Storage and Edge Functions. Capacitor 8 packages the mobile apps.

| Path | Role |
| --- | --- |
| [src/](src) | Current application, UI, search, native integrations and API clients |
| [public/](public) | Web assets, PWA files and public policy pages |
| [supabase/functions/](supabase/functions) | Server handlers for AI, opportunity signals, team access and administration |
| [supabase/migrations/](supabase/migrations) | Versioned database and access-policy changes |
| [android/](android), [ios/](ios) | Native projects and device test targets |
| [tests/](tests), [workflows](.github/workflows) | Unit, browser, database-policy and native release checks |
| [scripts/](scripts) | Boundary import, mobile preparation and release guards |
| [docs/](docs) | Product design, operating procedures and release records |

The root `app/`, `components/`, `lib/`, `data/` and `next.config.*` files belong to an earlier Next.js prototype. They are not the active Vite entry point. Historical SQL scripts are retained alongside versioned migrations; do not run every SQL file as a fresh-install procedure.

## Local development

Use Node 22 or later and the committed lockfile:

```sh
npm ci
```

Create an ignored `.env.local` with public frontend configuration:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Never place a service-role key, provider token, SMTP password or signing key in a `VITE_` variable or commit it to Git.

```sh
npm run dev
npm run check
```

`check` runs source/unit tests, TypeScript compilation and the production Vite build. Browser suites use isolated fixtures and mocked account flows where specified:

```sh
npx playwright install --with-deps chromium webkit
npm run test:e2e
npm run test:auth
npm run test:safety
```

The account-deletion policy tests use an isolated local database and do not delete production accounts:

```sh
npm run test:account-deletion
npm run test:ios-guard
```

## Backend configuration

Review the versioned migrations and required function configuration for the target Supabase project. Apply changes through the normal migration process. Privileged credentials belong only in trusted deployment or maintenance environments.

Boundary-dependent registration fails closed if the trusted Newham boundary is missing or invalid. From a trusted operator environment with the required maintenance credentials, install or refresh it with:

```sh
npm run seed:boundary
```

AI functions need server-side Cloudflare configuration; an unconfigured provider may return a local fallback. See [FREE-AI-SETUP.md](docs/FREE-AI-SETUP.md) for activation and verification.

## Mobile builds and release checks

Android and iOS use bundle/package ID `uk.histreets.app` and source version `0.3.2`. Android currently has versionCode `3`; the first iOS build is `1`. Build numbers must increase for subsequent store uploads.

```sh
npm run mobile:sync
npm run mobile:android

npm run ios:sync
npm run ios:verify
npm run mobile:ios
```

The iOS-only sync leaves Android preparation separate. Native release guards reject preview or incomplete bundles. Android builds need the documented JDK and SDK; iOS builds need a Mac and Xcode. See [mobile setup](docs/MOBILE-BUILD.md), [iOS submission](docs/IOS-SUBMISSION.md) and [Google Play submission](docs/PLAY-SUBMISSION.md).

CI covers secret scanning, dependency audit, source contracts, compilation, browser flows and native builds. Browser checks include navigation, map/search fallbacks, scrolling, account controls, AI consent, reporting and HiPulse. iOS CI builds an unsigned device archive and runs native navigation tests on iPhone and iPad simulators.

Passing CI establishes the tested behaviour. Before publication, also verify real account/email flows, private uploads, provider responses, moderation and deletion operations in the installed release. Store declarations, signing, physical-device checks and store review remain separate steps. An unsigned iOS archive is not a TestFlight upload.

## Contributing and contact

Contributions from developers, designers, local businesses, researchers and community organisations are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes. Report security issues privately using [SECURITY.md](SECURITY.md).

Creator and maintainer: **Ahtashamul Haque**

Contact: **ahaque@atomicmail.io**

## Licence

The repository includes the [CC0 1.0 Universal](LICENSE) dedication. Third-party components retain their own licences and notices.
