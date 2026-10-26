# HiStreets product vision and implementation

HiStreets was created by **Ahtashamul Haque**, who maintains the project, as an independent open-source product for local businesses, residents and community organisations. Its initial geographic focus is the London Borough of Newham. This record describes the source as at 26 October 2026.

## The problem

Small businesses may have limited time, advertising budgets or confidence with digital marketing and recruitment tools. A short-lived offer or weekend vacancy can remain in a shop window or private message group. Nearby residents may never see it. Community support can be similarly dispersed.

HiStreets brings these opportunities into one map and related feeds. It connects a post with the business or organisation offering it, so people can understand what is available and where. Public browsing does not require a resident account.

The intended benefit is easier local participation. Demonstrating increased sales, employment or wider community outcomes requires evidence beyond the existence of these features.

## Product design and innovation

### A shared map for local opportunities

Category markers identify business locations, and activity badges indicate an available offer, job or community post. A business detail sheet brings together its name, location and posts. Dedicated feeds offer another route to the same opportunities. The interface reduces the need to switch between separate services for everyday local discovery.

Public map coverage is distinct from verified business participation. A listing may be unclaimed; claiming, verification and publishing are separate steps. [MapView](../src/components/MapView.tsx) and [BusinessDetailSheet](../src/components/BusinessDetailSheet.tsx) implement the discovery flow.

### Search that does not depend on AI

Business categories, common local needs, streets and postcodes have deterministic handling. Optional location is requested only when chosen. Ask HiStreets adds an optional AI interpretation step after explicit consent, while results still come from the local database. Declining AI sharing leaves ordinary search available.

See [smartSearch](../src/lib/smartSearch.ts), [SmartMapSearch](../src/components/SmartMapSearch.tsx) and the [server handler](../supabase/functions/histreets-ai/index.ts).

### A practical publishing workflow

Verified businesses can publish structured offers, vacancies, free meals and community support. Jobs can include pay, hours, location and CV requirements. Residents can apply without an account, with private CV access limited to the relevant business or authorised administrator.

Business Copilot turns an owner's plain-language instructions into a draft after a separate AI-sharing opt-in. The owner edits and reviews the draft before choosing to publish. Team access, invitations and interaction analytics support ongoing management. See [PostComposer](../src/components/PostComposer.tsx), [job applications](../src/components/JobApplicationsPanel.tsx) and [workspace access](../src/lib/workspaces.ts).

### An inspectable HiPulse score

HiPulse summarises current activity and map coverage through four visible, capped factors: live activity (40 points), category diversity (20), coverage (20) and balance across offers, jobs and community posts (20). People can inspect each contribution and open the corresponding posts or map.

Its deterministic calculation does not need an AI provider or personal search history. Directory coverage can contribute points without live posts or verified owners. The score describes available platform data; it is not an official statistic or economic forecast. See the [scoring function](../src/lib/hiPulse.ts), [interface](../src/components/HiPulse.tsx) and [worked example and limitations](hipulse.md).

### Aggregate signals for business decisions

Opportunity Gap uses a seven-day category and postcode-area count. A verified owner receives a signal only when at least five recorded searches meet the threshold. The response includes the area's current offer count and can lead to a Copilot draft.

The count is not a count of unique people, and the available-offer count does not establish a precise supply match for every request. Raw search text is not retained in the aggregate signal table. Sensitive-term filtering excludes some inputs, but it is not comprehensive anonymisation. The feature is an indication for an owner to consider, not a validated demand forecast. See the [opportunity function](../supabase/functions/histreets-opportunity/index.ts) and [implementation notes](local-intelligence-engine.md).

Together, these features connect local discovery, publication and understandable activity signals. Their contribution lies in the product design and connected workflows. The project uses established technologies and makes no market-wide claim to be the first or only service with these features.

## Contribution and implementation

Ahtashamul leads the product concept, user experience, application and data design, integration, testing and release work. The implementation and development history are available under the GitHub account zaid3. Dependencies and third-party services retain their own licences and attribution.

The active application uses React, TypeScript, Vite and MapLibre. Supabase provides authentication, Postgres/PostGIS, private file storage and server functions. Capacitor packages the shared interface for Android and iOS.

The implementation includes geographic boundary checks, separate public and protected data paths, business ownership and team permissions, content reports, device-local blocking, explicit AI-sharing consent and a private account-deletion request queue. Deletion remains an operator-run procedure; submitting a request does not itself erase data.

## Implementation and release records

The public HiPulse implementation is recorded in [commit b888a82](https://github.com/zaid3/hi-streets-app/commit/b888a82e4e9c6c30db0b98ca0b7e384c46dddd21), dated 24 August 2026. Current release workflows exercise unit, database-policy, browser and native checks.

The [Android 0.3.2 record](FINAL-ANDROID-0.3.2.md) describes the signed artifacts produced on 20 October 2026. Later source changes require a fresh release build. The [iOS setup](IOS-SUBMISSION.md) includes an unsigned archive workflow and iPhone/iPad simulator tests. Apple signing, physical-device validation and store submission are separate from source readiness. These records do not establish a public store launch.

Website visits, map listings, verified businesses, feedback responses and demonstrated community outcomes are different measures. Reports should retain their dates and definitions rather than treating them as interchangeable evidence of adoption.

## Future work

The long-term aim is to help small businesses become easier to discover, make nearby work easier to find and improve access to community support. Wider borough coverage, messaging-based publishing and additional accessibility information remain future work. Parking stays marked as coming soon until reliable, authoritative data is available.
