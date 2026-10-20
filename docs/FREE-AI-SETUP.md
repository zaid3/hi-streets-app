# HiStreets free AI setup

Selected on 20 October 2026: Groq Free, using `openai/gpt-oss-20b`.
The model is listed as a production model. Published free limits are 30 requests
per minute, 1,000 per day, 8,000 tokens per minute and 200,000 tokens per day.
The first applicable limit wins; account-specific limits are authoritative.
These are shared application limits, not an allowance for each HiStreets user.

## Activate

1. Create or use a Groq account at https://console.groq.com/ and keep it on Free.
   Do not upgrade to Developer or add a paid billing arrangement for this launch.
2. Create an API key and add it directly in Supabase → Hi-Street → Edge Functions
   → Secrets, with the name `GROQ_API_KEY`. Do not paste it into chat, GitHub, an
   Android build, a browser environment variable or a screenshot.
3. In Groq Data Controls, enable Zero Data Retention. This setting is available
   to all customers; verify it is enabled rather than assuming it.
4. Deploy `histreets-ai/index.ts` and its relative dependency `groq.ts` together.
   Keep `verify_jwt=false`: public resident searches are intentionally public;
   Business Copilot authenticates the JWT and business owner inside the handler.
5. Publish the updated provider disclosures in the web app and policy pages.
   Rebuild the signed Android package before distributing it; version 0.3.1's
   bundled interface still names the old provider.
6. Test a non-sensitive search and confirm `ai_processing=groq_intent`, then test
   a verified owner's draft and confirm `groq_draft`. Test real-account flows in
   the installed release. A local fallback response does not prove AI is active.

## Behaviour and spending

The old Gemini key is no longer read, and no Gemini endpoint is called. Missing
Groq credentials, errors, invalid output, rate limits and an eight-second timeout
use the existing local search/draft fallback. There are no automatic retries,
provider switching, paid tools, browsing or code execution. No billing setting is
changed by this code. Staying free depends on the account remaining on Free.

Credentials stay server-side. Requests flagged as sensitive by the existing
resident filter stay local; keyword filtering cannot detect every sensitive
request. Users must not enter confidential or sensitive personal information.
Public results still come from the HiStreets database. Owners review every draft.

Sources checked 20 October 2026:

- https://console.groq.com/docs/models
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/billing-faqs
- https://console.groq.com/docs/your-data
- https://console.groq.com/docs/structured-outputs

Before the live account is configured and tested, report this as an implemented
replacement with local fallback, not a verified working Groq integration.
