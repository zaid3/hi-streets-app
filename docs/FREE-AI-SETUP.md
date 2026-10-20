# HiStreets free AI setup

Final selection on 20 October 2026: Cloudflare Workers Free, using the hosted
open-weight model `@cf/openai/gpt-oss-20b` (Apache 2.0 model licence).
Workers AI includes 10,000 neurons per day. Neurons are computing units, not
requests. On Workers Free, calls fail when the allowance is exhausted instead
of producing paid overages. Stay on Workers Free and do not enable paid Workers
or AI Gateway credits for this launch. Account-wide usage shares the allowance.

See `AI-LICENCE-AND-PRIVACY-REVIEW.md` for the commercial-use review and remaining
privacy, moderation and release requirements. Permission to use the model is not
a certification of the whole application's legal compliance.

## Activate

1. In Cloudflare, open Workers AI → Use REST API → Create a Workers AI API Token.
   Use the account-scoped template (Workers AI Read and Edit), not an email token
   or a global API key. Copy the Account ID, not the Zone ID.
2. Add the values directly in Supabase → Hi-Street → Edge Functions → Secrets:
   `CLOUDFLARE_AI_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
   Do not paste credentials into chat, GitHub, the Android build or screenshots.
3. Deploy `histreets-ai/index.ts` and its dependency `cloudflare.ts` together.
   Keep `verify_jwt=false`: resident searches are public; Business Copilot checks
   the JWT, business verification and ownership inside the handler.
4. Publish the updated provider disclosures in the web app and policy pages.
   Rebuild the signed Android package: the earlier signed 0.3.1 interface still
   names Gemini. An old package does not contain the updated disclosures.
5. Test a non-sensitive search and confirm `ai_processing=cloudflare_intent`,
   then test a verified owner's draft and confirm `cloudflare_draft`. Test the
   installed release with an ordinary account. A fallback response is not proof
   that external AI is configured or working.

## Behaviour, privacy and spending

Gemini and Groq are no longer called by the replacement source. Missing secrets,
provider errors, malformed output, quota errors and an eight-second timeout use
existing local fallbacks. Busy capacity is rejected rather than queued.
No retries, paid tools, browsing, code execution, AI Gateway logging/caching,
provider rotation, paid billing activation or plan upgrades are performed.

The key stays on the server. Inputs flagged by the existing sensitive-request
filter stay local; keyword filtering cannot detect every sensitive request.
Users must not enter confidential or sensitive personal information. Resident
results come from the HiStreets database; owners must review every draft.

Cloudflare states that it does not use Workers AI customer content for training
and does not retain standard inference content beyond processing, subject to
limited safety/legal exceptions. Operational metadata may be retained. This
integration does not use stateful AI features, prompt logging or caching.

## Release status

The user approved deployment and Cloudflare processing on 20 October 2026.
Supabase `histreets-ai` version 11 is ACTIVE with `index.ts` and `cloudflare.ts`.
After the owner saved the credentials and the function was refreshed, a synthetic
resident search returned HTTP 200 with `ai_processing: cloudflare_intent`.
This confirms provider processing; the search returned zero matching listings.
Unauthenticated business drafting returned 401 and an untrusted origin returned 403.
Authenticated business drafting remains untested. No paid plan or billing settings
were changed; the account's plan was not independently queried.

The owner supplied the original signing-key backup, and its private-key entry
was validated. Version 0.3.2 (versionCode 3) is being rebuilt using that key.
Previous 0.3.1 files predate this provider/disclosure change. Web publication,
account/device checks and the operational review in
`AI-LICENCE-AND-PRIVACY-REVIEW.md` remain separate release gates.

Sources checked 20 October 2026:

- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/platform/data-usage/
- https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/
- https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- https://github.com/openai/gpt-oss/blob/main/LICENSE
