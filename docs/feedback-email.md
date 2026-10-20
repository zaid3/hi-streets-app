# Feedback storage and email

The form at https://app.histreets.uk/feedback saves each successful submission privately in `public.user_feedback`. The founder can read it in **Business → User feedback**. Email notifications go only to **ahaque@atomicmail.io**. Respondents' addresses are Reply-To, never the sender. Actual experience and future plans are labelled separately.

## Configuration

Apply the feedback migrations in order, including `20261020005540_feedback_cloudflare_delivery.sql`.

1. Enable Cloudflare Email Routing for `histreets.uk` and verify **ahaque@atomicmail.io** as a destination in the same Cloudflare account. Create a routing rule for `hello@histreets.uk` to that address if replies to the sender should be forwarded.
2. Create a Cloudflare custom API token with **Account → Email Sending → Edit**, restricted to the account containing this domain. Do not grant unrelated permissions.
3. Add these values privately in the project's **Supabase Vault**:
   - `histreets_feedback_cloudflare_api_token`: the token.
   - `histreets_feedback_cloudflare_account_id`: the 32-character account ID (not the zone ID).
   - `histreets_feedback_from_email`: `hello@histreets.uk`, after routing is active for the domain.
4. Keep `net`, `vault` and `feedback_private` outside the Data API's exposed schemas. Requests selecting these profiles must return `PGRST106` before enabling credentials.
5. Submit one clearly labelled test and verify the saved response and actual receipt at **ahaque@atomicmail.io**. Remove only that synthetic feedback record afterwards.

No secret belongs in frontend code, repository files, chat or screenshots. The database saves feedback without sending credentials; queued messages wait for configuration.

Cloudflare documents free sending to verified destinations on all plans, including accounts with Email Routing only. These messages do not count against its monthly sending quota or daily sending limits. This applies to the fixed verified founder inbox; it is not unrestricted free customer or authentication email. Other service limits remain. Sources: [verified destinations](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/), [sending limits](https://developers.cloudflare.com/email-service/platform/limits/), [REST API](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/).

## Reliability and privacy

- Saving feedback and inserting its notification job share one transaction.
- The existing scheduled job runs every minute and dispatches at most one message per run.
- Messages include plain text and escaped HTML, submission time, reference, quotation consent and a note that identity and usage dates are self-reported.
- A successful response must explicitly list the fixed recipient as delivered or queued, with no reported bounce or suppression. The founder sees **Accepted by email provider**. This does not prove inbox placement.
- A definite HTTP 429 rejection retries the frozen message with backoff, up to eight attempts within 23 hours. Timeouts, missing responses, server errors, permanent rejections and ambiguous responses require review before resending. Cloudflare's REST documentation does not promise idempotent sends; automatic retries after an ambiguous result could duplicate messages.
- Provider changes never automatically resend a previously attempted message. Failed email does not delete feedback.
- Credentials are encrypted at rest in Vault. The HTTP worker includes the token in queued request headers. Trusted database login roles can read `net` on hosted Supabase because its platform-owned grants cannot be revoked by project migrations. Browser protection depends on excluding `net` from the Data API, not on those grants. Do not give database logins to untrusted users. See [Supabase pg_net access guidance](https://supabase.com/docs/guides/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16).
- Only the founder can read feedback and delivery status through the app. The token permits sending for the selected account; protect it and rotate it if exposed.

Run `npm run test:feedback` and `npm run test:feedback-email` for isolated PostgreSQL checks. The latter uses a mock HTTP transport and sends no real email. A real delivery test remains necessary after credentials are configured.
