# HiStreets Local Intelligence Engine

HiStreets is designed as borough-level local digital infrastructure rather than a general-purpose chatbot or directory. The first operating area is the London Borough of Newham.

The intelligence layer connects four product capabilities:

1. **Ask HiStreets** — understands a resident's immediate local need and retrieves actionable results from verified HiStreets data.
2. **HiPulse** — explains the amount and balance of current platform activity using a transparent deterministic score.
3. **Opportunity Gap** — aggregates eligible non-sensitive demand signals by broad category and outward-postcode area without storing raw prompts for this purpose.
4. **Business Copilot** — helps an authenticated owner turn a rough idea into a factual structured post, which the owner must review before submitting.

## Closed local feedback loop

```text
Resident need
    ↓
Ask HiStreets intent understanding
    ↓
Verified businesses / live posts
    ↓
Useful resident action
    ↓
Eligible anonymous aggregate demand signal
    ↓
Opportunity Gap
    ↓
Business insight / Business Copilot
    ↓
Owner-reviewed local offer, job or support post
    ↓
New verified supply becomes discoverable by residents
```

The long-term goal is not to make AI answer every question. It is to shorten the distance between a local need and a useful local action while giving participating independent businesses a simpler way to respond to genuine neighbourhood demand.

## Source-of-truth rule

Gemini is an interpretation and drafting component. It is **not** the source of local facts.

Resident results are selected from HiStreets' approved public business and live-post datasets. The server does not ask the model to invent nearby businesses, jobs, offers or community services. If there is no verified result, the response says so.

Business Copilot receives the verified business context and the owner's prompt. It is instructed not to invent prices, wages, dates, hours, benefits, certifications or offer conditions. Missing important information is returned as `missing_fields` rather than guessed.

## Human control for business publishing

Business Copilot returns a draft only. A draft response explicitly contains:

```json
{
  "requires_owner_review": true,
  "published": false
}
```

The owner must first choose **Use this draft**, review/edit the populated form, and then separately choose **Submit post**. Existing platform moderation and auto-approval rules remain the publication boundary.

## Privacy boundary

Raw resident prompts are not stored in the Opportunity Gap table.

Opportunity Gap stores only:

- outward-postcode area,
- a broad allowed commercial category,
- date,
- aggregate count.

The initial allowed categories are food & drink, jobs, retail, beauty, local services and leisure.

Sensitive requests are excluded from commercial demand intelligence. Requests involving immigration/asylum, hardship/free meals, medical or mental-health needs, disability, homelessness, domestic abuse, religion, sexual matters, crime/police and related vulnerability terms bypass Gemini and use a local private routing fallback. They do not create business opportunity signals.

## Abuse and cost controls

The public AI route uses a server-side daily quota bucket. A one-way SHA-256 key is derived from request metadata for rate limiting; the raw fingerprint is not written to the quota table. Business Copilot uses a separate quota tied to the authenticated account.

If the AI provider is unavailable or a quota is exhausted, core HiStreets map, postcode and smart-search features remain usable.

## Deployment boundary

The browser never receives the Gemini API key.

```text
React / Vite client
       ↓
Supabase Edge Function: histreets-ai
       ↓
Gemini API (intent / draft generation)
       ↓
validated structured output
       ↓
HiStreets verified database results / owner review
```

`GEMINI_API_KEY` is stored only as a Supabase Edge Function secret. No `VITE_GEMINI_API_KEY` exists.

## Current limitations

- Ask HiStreets is Newham-only.
- It searches currently available HiStreets public data; it is not a general internet search engine.
- HiPulse measures HiStreets platform activity, not official borough economic performance.
- Opportunity Gap is an aggregate platform-demand signal, not a demographic or economic forecast.
- Parking remains outside the AI recommendation layer until authoritative parking data is available.
- A free-tier model/provider can impose request limits or availability constraints; the UI must fail gracefully.

## Expansion model

The product is intentionally borough-scoped. Expansion to another borough should require a verified geographic boundary, borough-specific data sources and the same trust/privacy controls rather than simply widening the map bounds.
