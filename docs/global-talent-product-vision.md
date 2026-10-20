# HiStreets product vision and implementation

HiStreets was conceived and developed by **Ahtashamul Haque** as an independent open-source product for local businesses, residents and community organisations. The initial geographic focus is the London Borough of Newham. This record describes the product as at 20 October 2026.

## The problem and intended users

Small businesses may have limited time, advertising budgets or confidence using digital marketing and recruitment tools. A short-lived offer or a weekend vacancy can remain in a shop window or a private message group, making it difficult for nearby residents to discover. Charity support can be similarly dispersed.

HiStreets addresses this discovery and publishing problem by linking opportunities to local business locations. A resident can browse nearby offers, local jobs and community assistance in one service. Businesses and charities can publish structured posts through the business workspace, subject to the platform's verification and moderation controls. Public browsing does not require a resident account.

The intended benefit is easier local participation: a small organisation can communicate an opportunity and nearby people can find it. Increased sales, employment or wider community outcomes require evidence beyond the existence of these features.

## Product innovation

### Location-linked opportunities

The map connects business locations with offers, jobs and community posts. It provides local context for an offer or vacancy, while the dedicated feeds allow people to inspect the details. The jobs workflow supports small local recruitment needs, including part-time and weekend roles. Community posts and free meals use the same local discovery system.

### HiPulse

HiPulse makes the platform's activity and map coverage inspectable. Its 0–100 score has four visible contributions: live activity, category diversity, map coverage and balance across offers, jobs and support. Users can inspect the breakdown and navigate to the corresponding posts or listings.

The model is deterministic. Its capped factors prevent any one factor from supplying the whole score, and its calculation does not need a personal search history or an AI provider. Public listings may be unclaimed; coverage points are not evidence of verified owners or customer adoption. See [the model, checked example and limitations](hipulse.md).

### Support for publishing and unmet local needs

Business Copilot turns an owner's plain-language description into a draft that the owner reviews before publication. Ask HiStreets interprets a resident's request against the platform's local data. The current provider integration is Cloudflare Workers AI, called through server-side functions.

Opportunity Gap is a separate mechanism for sufficiently aggregated demand signals. It is designed to surface unmet needs to relevant businesses only after privacy thresholds are met. Its presence in the code is not evidence that businesses have received or acted on such signals.

These features form a connected product workflow: discovery, publication, understandable activity signals and assistance for local participation. The implementation uses established technologies. A claim about novelty across the entire market would require comparative evidence beyond this repository.

## Individual contribution and implementation

Ahtashamul's contribution covers the product concept, user experience, application and database design, geospatial discovery, business and community workflows, integration, testing and deployment. The source and commit history are public under the GitHub account `zaid3`.

The implementation includes:

- React and TypeScript interfaces with a MapLibre map.
- Supabase/PostGIS data queries and geographic boundary enforcement.
- Separate public listing, ownership verification and posting states.
- Server-side and database controls for protected business and administration actions.
- Private storage and authorised access for job CVs and verification documents.
- HiPulse's scoring function and factor breakdown.
- AI-assisted search and owner-reviewed drafts through server-side functions.
- A web application and an Android project, with source and browser release checks.

The source establishes what has been implemented. Operational status and outcomes must be checked against deployment records, product behaviour and independent evidence.

## Development and early evidence

The public HiPulse implementation commit is [`b888a82e4e9c6c30db0b98ca0b7e384c46dddd21`](https://github.com/zaid3/hi-streets-app/commit/b888a82e4e9c6c30db0b98ca0b7e384c46dddd21), dated 24 August 2026. The live web service and Android test build provide further implementation records.

At the 20 October 2026 review, Android evidence concerned a test release. It must not be described as a public Play Store production launch without the corresponding production release record.

Early analytics and user feedback can show initial engagement and reactions. Website activity, map listings, feedback respondents and independently verified outcomes are different measures and should retain their original dates and definitions.

## Community vision and future work

The aim is to help small businesses become easier to discover, make nearby work easier to find and improve access to charity and community support. Newham is the starting point; wider borough coverage is a future development goal.

Potential future work includes simpler messaging-based publishing and accessibility information. Parking remains marked as coming soon until authoritative data can support it. These plans should remain distinct from completed functionality and demonstrated outcomes.

## Evidence and attribution

This document explains the product; it is not an independent assessment or an endorsement decision. Application evidence should connect a specific contribution to dated source records, independent observations and accurately described early use. Open-source components and AI features should be attributed accurately alongside the founder's responsibility for the product.
