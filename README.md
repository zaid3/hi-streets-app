# HiStreets

**Helping local businesses grow with technology.**

HiStreets is an open-source, Newham-first digital high street. It helps residents discover local businesses, offers, jobs and community support while giving local business teams simple tools to become more visible, publish opportunities and use neighbourhood intelligence without building their own technology platform.

**Website:** https://histreets.uk/  
**Live app:** https://app.histreets.uk/  
**Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)  
**Security:** [SECURITY.md](SECURITY.md)

> HiStreets is not trying to replace the local high street. It is trying to strengthen it — making useful local activity easier to discover and giving local businesses a shared digital layer.

## Why HiStreets exists

National brands can reach customers through apps, websites, email campaigns, loyalty programmes, advertising teams and large recruitment platforms. Local businesses often have the same need to communicate an offer, find a local employee or reach nearby residents, but should not need a large digital team to do it.

At the same time, useful neighbourhood information is fragmented. A local job might only appear in a shop window. A restaurant offer may only reach existing followers. A community group may be providing support a few streets away from someone who does not know it exists.

HiStreets brings those everyday local connections into one place.

## Product

### Map-first local discovery

Residents can browse approved local businesses and useful activity geographically across Newham. The product supports business/service search, streets, full postcodes, outward postcodes and optional user-initiated “near me” location.

### Local offers

Local businesses can publish offers that become visible through HiStreets rather than relying only on their own website, social following or passing foot traffic.

### Local jobs

Approved businesses can publish local vacancies and residents can discover opportunities near home. Job applications do not require a resident account; CVs are stored privately and opened by the relevant business or authorised admin through temporary access links.

### Community support and free meals

Commerce and community sit inside the same local ecosystem. HiStreets surfaces community-support activity and free-meal initiatives alongside businesses, offers and jobs.

### Ask HiStreets AI

Ask HiStreets lets residents describe a local need in natural language. The AI layer interprets intent and works with HiStreets local data rather than inventing businesses, jobs or offers. Sensitive requests use privacy-conscious fallback behaviour rather than becoming commercial demand signals.

### Business Copilot

Business owners can describe an offer or job in simple words and receive an AI-assisted draft. The business remains in control: Copilot creates a draft for review and does not auto-publish it.

### HiPulse

HiPulse is an explainable 0–100 HiStreets activity signal derived from currently visible platform activity such as offers, jobs, community support, approved-business coverage and category diversity.

HiPulse is a **HiStreets product signal**. It is not an official London Borough of Newham statistic, economic forecast or neighbourhood ranking. See [docs/hipulse.md](docs/hipulse.md) for the scoring model and limitations.

### Opportunity Gap

Opportunity Gap explores the difference between sufficiently aggregated local demand signals and available local supply. It is designed to help relevant businesses understand unmet neighbourhood needs without exposing an individual resident's search history. Privacy thresholds are used before a business can receive an opportunity signal.

### Business workspace

A business can:

- create a secure account
- search for and claim an existing approved listing
- register a new business when it is not already listed
- submit private verification evidence
- manage an approved business profile
- publish offers, jobs, free meals and community-support posts
- use Business Copilot
- view relevant job applications
- use Opportunity Gap when sufficient aggregate signals exist

Returning owners are taken toward management rather than repeatedly being forced through full onboarding.

### Admin and Super Admin

Business owners, Admins and Super Admins use the **same secure access page**. Authentication establishes the user identity; the stored role and server/database checks determine which workspace and operations are available.

Super Admin tools include user/role management, business registration and ownership review, moderation and platform oversight. Admin privileges are not granted by a hidden frontend route or button.

### Parking

**Parking section kept as coming soon** until reliable, authoritative local parking information can be integrated. HiStreets does not publish guessed parking restrictions.

## What makes the architecture different

HiStreets combines several local workflows that are usually separated:

**resident need → local discovery → anonymous aggregate signal → opportunity gap → business insight → AI-assisted business action → new local supply → resident discovery**

The value is not one isolated AI feature. It is the connection between geospatial discovery, local commerce, employment, community support, explainable signals and owner-controlled AI assistance.

## Trust and privacy

Current design principles include:

- public resident browsing without account creation
- approved-business rules before listings become public
- Newham geographic enforcement for relevant registration and map flows
- private job CV storage
- private business-verification evidence
- role and ownership checks for protected business/admin operations
- owner review before AI-assisted business drafts are published
- aggregate Opportunity Gap signals rather than individual resident search histories
- **No fake businesses, jobs, offers, meals or parking**
- no active public review/rating system in this release

See the public Privacy and Terms pages in the app for user-facing information.

## Account access

HiStreets keeps the account experience intentionally simple:

- **New user:** Create account → email + password → confirm email when required.
- **Returning user:** Sign in → email + password.
- **Forgot password:** request a secure reset email and choose a new password.
- **Optional passwordless sign-in:** an existing account can request and enter a six-digit email code.
- **Admins:** use the same sign-in page; the authorised role determines the admin workspace after authentication.

The frontend currently requires **12 or more characters** when creating or resetting a password. Supabase Auth handles password authentication and sessions.

## Newham first

HiStreets starts with the London Borough of Newham deliberately. The aim is to make one real local ecosystem useful before adapting the model to other boroughs and communities.

## Technology

- React 18
- TypeScript
- Vite
- MapLibre GL JS
- Supabase Auth
- Supabase Postgres / PostGIS
- Supabase Storage
- Supabase Edge Functions
- Google Gemini through server-side Edge Function integration for AI-assisted flows
- Progressive Web App shell
- Playwright browser release testing

## AI architecture

Production AI-related functions include:

- `histreets-ai` — resident intent assistance and owner-reviewed business drafting
- `histreets-opportunity` — privacy-thresholded business opportunity signals
- `histreets-admin-users` — authenticated Super Admin user/role management

AI provider secrets stay server-side and are not committed to the frontend repository.

## Engineering and release quality

Changes are developed through branches and pull requests. The release workflow checks:

- secret leakage
- production dependency audit
- source/product contracts
- TypeScript compilation
- production Vite build
- mobile Chromium behaviour
- mobile WebKit / iPhone behaviour
- desktop Business/Admin layout contracts
- route/navigation behaviour
- scroll and fixed-navigation clearance

The browser suite covers Map, Offers, Jobs, Community, Parking and Business navigation as well as core map/search/location/HiPulse/business-access behaviours.

## Local development

Install dependencies:

```bash
npm install
```

Create local frontend environment values:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Start development:

```bash
npm run dev
```

Run source/unit release checks:

```bash
npm run test:unit
```

Run the production build:

```bash
npm run build
```

Install browser test dependencies and run Playwright:

```bash
npx playwright install chromium webkit
npm run test:e2e
```

## Database and server-side configuration

Database migrations are tracked under [`supabase/migrations`](supabase/migrations). Edge Function source is tracked under [`supabase/functions`](supabase/functions).

Service-role keys, AI provider keys, SMTP credentials and other privileged secrets must remain in secure deployment/server environments and must never be placed in browser code or committed to Git.

The official Newham boundary must exist and be valid before boundary-dependent business registration is considered operational. Business registration is designed to fail closed when the trusted borough boundary is unavailable.

From a trusted operator environment with the required server-side maintenance credentials, install or refresh the official boundary with:

```bash
npm run seed:boundary
```

Never expose the service-role key in frontend environment variables.

## Production checklist

Before a public release, verify at minimum:

1. Map and direct `/map` route load correctly.
2. Newham postcode search accepts valid Newham postcodes and rejects non-Newham postcodes.
3. Optional location works when approved and the app remains usable when location is denied.
4. Offers, Jobs and Community remain scrollable without visible scrollbar rails or bottom-navigation overlap.
5. All six bottom navigation destinations stay on one row across mobile Chromium, mobile WebKit and desktop.
6. Create account, email confirmation, password sign-in, forgot-password and recovery work with real production email delivery.
7. Existing-account secure email-link sign-in works without silently creating a new account.
8. Business claim and new-business registration correctly avoid duplicates.
9. Verification evidence and CVs remain private.
10. Admin/Super Admin access is role-protected after the same authentication page.
11. Ask HiStreets returns grounded local behaviour in a real production request.
12. Business Copilot returns an owner-reviewed draft and does not auto-publish.
13. Opportunity Gap does not expose individual resident searches and remains hidden when privacy thresholds are not met.
14. HiPulse displays its explainable factor breakdown.
15. Parking remains Coming Soon until authoritative data is available.
16. PWA manifest and service worker load successfully.

## Security

Please report suspected vulnerabilities privately rather than opening a public issue. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

## Contributing

HiStreets is open source and open to collaboration with developers, designers, local businesses, researchers, community organisations and people interested in civic technology, geospatial systems and responsible local AI.

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes.

## Concept & development

**HiStreets was conceived and developed by Ahtashamul Haque.**

The project is being developed as an open-source technology initiative focused on helping local businesses grow with technology while strengthening connections between businesses, residents, employment opportunities and community support.

Contact: **ahaque@atomicmail.io**

## Licence

The repository currently includes the [CC0 1.0 Universal](LICENSE) dedication. Review the licence before reusing or redistributing project material.
