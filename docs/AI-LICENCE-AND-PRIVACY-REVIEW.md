# AI release review — 20 October 2026

Scope: the proposed Cloudflare Workers AI integration for HiStreets local search
interpretation and owner-reviewed business drafts. This is a source and public
terms review, not a legal opinion, security certification or production sign-off.

## Use permission

The selected model is `@cf/openai/gpt-oss-20b`, hosted by Cloudflare. OpenAI's
official licensing guidance permits commercial use under Apache 2.0, subject to
the gpt-oss usage policy. The 20B model's published usage policy requires compliance
with applicable law. The Android app does not redistribute model weights or call
OpenAI's hosted API. Apache notice requirements must be reassessed if weights or
model source are later distributed; third-party app dependency licences still apply.

Cloudflare's Workers AI terms contemplate customer applications and end users.
They leave responsibility for inputs, outputs, permissions and end-user activity
with the customer. Cloudflare does not provide an indemnity for model-related
claims. Do not describe the licence as immunity from copyright, privacy or other
claims, or claim endorsement by OpenAI or Cloudflare.

Workers Free includes 10,000 neurons/day, not a fixed number of chats. Stay on
Workers Free: no paid plan, prepaid credits, multiple accounts to evade quotas,
or provider rotation to bypass limits. The model is not in the published list
requiring paid billing. Free service availability can change.

## Controls verified in the prepared source

- The provider token is server-side. The client calls the HiStreets backend.
- Provider requests contain bounded search text or business-draft instructions
  and selected business fields, not the Supabase token, CVs or uploaded files.
- Resident search returns database listings, not invented model answers.
- Business drafts require authenticated access to a verified business and a
  separate owner action to publish. AI does not select job applicants.
- Per-client/account quotas, an eight-second provider timeout, no paid fallback
  and safe error messages limit exposure and unexpected provider use.
- Existing sensitive-term detection keeps some resident requests local. It is
  not comprehensive redaction and does not protect every business-draft input.
- Both AI response surfaces have in-app reporting. Actual moderation handling
  and harmful-output prevention need operational validation; a report button or
  a system prompt alone is not proof of Google Play policy compliance.
- Provider disclosure, privacy rights, ICO complaints and AI use restrictions
  are included in the prepared policy source. Public availability and accuracy
  must be checked against the deployed policy at release time.

## Privacy and legal work still needed before claiming readiness

1. Record the operator's lawful basis for each purpose and put the adopted bases
   in the privacy policy. The current policy does not yet provide this mapping.
   Core accounts, optional AI, public directory data, feedback, analytics and
   moderation must be considered separately. Do not label all processing
   "consent" or assume a button click settles UK GDPR requirements.
2. Confirm provider contracts and international-transfer arrangements against
   the actual accounts. Cloudflare's self-serve agreement incorporates its DPA;
   the DPA includes UK transfer provisions. Those clauses do not by themselves
   document HiStreets' transfer assessment. Do not promise UK-only processing.
3. Complete a DPIA screening and, if the processing is likely to present high
   risk, a DPIA before processing. Record retention criteria, rights handling,
   deletion operations and public-directory data sources. Existing deletion and
   moderation procedures require a responsible operator and actual follow-up.
4. HiStreets allows businesses to publish content that other users see. Assess
   Online Safety Act scope using Ofcom's service checker; if in scope, complete
   the applicable illegal-content and children's-access assessments and duties.
   Small size, free access and a Play age declaration do not settle this question.
5. Finish Google Play Data safety, target audience and account deletion entries
   from actual behaviour. Test ordinary-account flows in the signed release and
   review the Play pre-launch results. Do not certify an untested release.

This review covers the model integration and the release work listed above.
It does not establish complete legal compliance or protection from liability.

## Deployment records

On 20 October 2026, the initial version 8 deployment returned local fallback
because provider configuration was missing or invalid. A later version 11 check,
after configuration, returned HTTP 200 with `cloudflare_intent`. Unauthenticated
business drafting returned 401 and an untrusted origin returned 403.
Authenticated provider drafting remains a separate check. See the dated record
in [FREE-AI-SETUP.md](FREE-AI-SETUP.md).

The signed Android 0.3.2 artifacts included Cloudflare disclosures and were
validated using the original upload key; see [the artifact record](FINAL-ANDROID-0.3.2.md).
Later shared-app changes add explicit AI-sharing consent and account-deletion
requests. New signed binaries are needed to distribute those changes. Source
checks do not replace installed-release validation, current public policy checks
or the operational work above.

## Official sources checked

- Model licence: https://github.com/openai/gpt-oss/blob/main/LICENSE
- Commercial-use guidance: https://help.openai.com/en/articles/11870455-openai-open-weight-models-gpt-oss
- Model usage policy: https://huggingface.co/openai/gpt-oss-20b/raw/main/USAGE_POLICY
- Cloudflare service terms: https://www.cloudflare.com/service-specific-terms-developer-platform/
- Cloudflare subscription agreement: https://www.cloudflare.com/terms/
- Cloudflare DPA: https://www.cloudflare.com/cloudflare-customer-dpa/
- Cloudflare data handling: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- Cloudflare pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- ICO privacy information: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/
- ICO DPIA guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/
- Ofcom service guidance: https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/guide-for-services
- Google Play AI policy: https://support.google.com/googleplay/android-developer/answer/13985936
