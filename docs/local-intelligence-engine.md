# HiStreets Local Intelligence Engine

HiStreets connects local discovery, business publishing and understandable activity signals. Its first operating area is the London Borough of Newham.

The implementation has four parts:

1. **Ask HiStreets** interprets a resident's request and retrieves local database results after permission for AI processing.
2. **HiPulse** shows a deterministic score and factor breakdown for current activity, category diversity and map coverage.
3. **Opportunity Gap** groups eligible search signals by broad commercial category, outward postcode and day.
4. **Business Copilot** helps an authenticated, authorised owner draft a structured post for review.

The intended flow is from a local need to a useful result, and from aggregate search activity to a business decision. An eligible Opportunity Gap signal can lead to a Copilot draft, but it does not automatically create or publish an offer.

## Source of local facts

Cloudflare Workers AI interprets requests and prepares drafts. Resident results come from the HiStreets database. The server does not ask the model to invent nearby businesses, jobs, offers or community services.

Resident business search includes listings with unclaimed or verified status. These states must not be presented as equivalent: a public directory listing is not proof of verified ownership or business participation. Post queries use live, unexpired records. No matching result is a valid outcome.

Business drafting requires a verified business and ownership or platform-administrator access. The model receives selected business fields and the owner's instructions. It is instructed not to invent prices, wages, dates, hours, benefits, certifications or conditions. Important omissions are requested as `missing_fields`; owners must still check the output.

See the [AI handler](../supabase/functions/histreets-ai/index.ts).

## Consent and owner control

Resident questions and business drafts have separate affirmative consent controls. The shared API client rejects an AI request without an explicit consent value. Declining leaves ordinary search and manual post creation available.

A business draft response contains:

```json
{
  "requires_owner_review": true,
  "published": false
}
```

The owner chooses **Use this draft**, reviews or edits the populated form, then separately chooses **Submit post**. Existing verification, moderation and publication rules still apply. See [the client](../src/lib/ai.ts) and [PostComposer](../src/components/PostComposer.tsx).

## Aggregate opportunity signals

The `ai_opportunity_daily` table contains an outward-postcode area, broad category, date and aggregate count. Raw resident prompts are not stored in this table. Direct client access is denied; recording and querying use protected server paths.

Allowed recording categories are food and drink, jobs, retail, beauty, local services and leisure. The current business-category matcher supports food and drink, retail, beauty, local services and leisure; it does not provide a jobs-specific business insight.

A verified owner's insight uses the matching category and area over the current UTC day and previous six days. It is hidden below five recorded signals. Five signals do not establish five unique people. The response includes current offers in that postcode area across categories, not a proven match between supply and each search. A failed offer lookup returns an unavailable response rather than implying zero offers.

This threshold limits what is shown, but it is not a guarantee of anonymity or a validated demand forecast. Repeated searches can affect the count. The [opportunity handler](../supabase/functions/histreets-opportunity/index.ts) defines the exact behaviour.

## Sensitive inputs and provider boundaries

The sensitive-term filter catches some requests involving hardship, health, immigration, abuse and other vulnerability-related topics. Matches bypass the external provider and commercial signal recording. A keyword filter cannot recognise all sensitive information, and business-draft instructions do not receive equivalent redaction. Users should not include confidential or sensitive personal information in provider-bound text.

Provider requests go from the React client through a Supabase Edge Function to Cloudflare Workers AI. The provider token stays in server secrets. CVs, uploaded verification files and Supabase session tokens are not included in the provider prompt.

The public AI route has a daily quota keyed by a one-way hash of request metadata. Business drafting has an authenticated-account quota. These are abuse controls, not a claim that all service data is anonymous. Provider errors, invalid output and timeouts use local fallbacks; ordinary map and search features remain available without AI.

See [provider setup and dated checks](FREE-AI-SETUP.md) and [the release review](AI-LICENCE-AND-PRIVACY-REVIEW.md).

## Scope and limitations

Ask HiStreets searches available local data; it is not an internet search engine. HiPulse describes platform data rather than official borough economic performance. Opportunity Gap is an aggregate indication rather than proof of unmet need or likely sales. Provider service limits can affect availability.

Parking remains outside recommendations until authoritative data is available. Expansion to another borough requires a trusted geographic boundary, appropriate data sources and equivalent access and privacy controls, not just wider map bounds.
