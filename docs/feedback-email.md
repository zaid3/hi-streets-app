# Feedback storage and email

The feedback form is at https://app.histreets.uk/feedback. Each successful submission is saved privately in `public.user_feedback`. The founder can read it in **Business → User feedback**.

The email recipient is **ahaque@atomicmail.io**. The sender is a verified address controlled by HiStreets. Respondents' addresses are used only as Reply-To, never as a forged sender. Messages distinguish actual experience from future plans.

## Deployment

1. Apply `20261019230908_user_feedback.sql` if not already deployed.
2. Apply `20261019235510_feedback_email_delivery.sql`.
3. In the project's Supabase Vault, add these values without pasting secrets into chat or GitHub:
   - `histreets_feedback_resend_api_key`: a Resend key with sending-only permission, restricted to the verified sending domain.
   - `histreets_feedback_from_email`: a sender address from a domain verified in that Resend account, such as `feedback@histreets.uk` **only after that domain is verified**.
4. Submit one clearly labelled test response and verify both the founder inbox and receipt at ahaque@atomicmail.io. An `accepted` status confirms acceptance by Resend, not final inbox delivery.
5. Keep `net`, `vault` and `feedback_private` out of the Data API's exposed schemas. Verify a request with `Accept-Profile: net` is rejected with `PGRST106` before enabling email credentials.

No sending provider or sender verification is created by this migration. Database saving works without those credentials; pending emails wait until configuration is complete.

Deployment checked on 20 October 2026: feedback saving and atomic email queue insertion passed a live rolled-back test; the scheduled job runs successfully; the public API rejects `net`, `vault` and `feedback_private` with `PGRST106`. The temporary test was removed by rollback. The worker currently reports `configuration_required`; no delivery to the recipient has been verified.

## Reliability and privacy

- The database transaction saves feedback and queues its email together.
- A server-side job checks every minute and sends at most one queued response per run.
- The same message body and idempotency key are used for retries. Automatic retries stop before the provider's 24-hour idempotency window expires.
- Failed emails never delete feedback. Credentials/domain errors and exhausted retries remain marked `needs_attention`.
- API credentials are encrypted at rest in Vault, then included in the queued HTTP request to Resend. Hosted Supabase grants database roles access to `net`; its platform-owned grants cannot be revoked by project migrations. Trusted database login roles can therefore read queued request headers. Browser access is prevented by keeping `net` outside the Data API's exposed schemas, not by a claim that these platform grants were removed. Do not grant database logins to untrusted users. See [Supabase's pg_net access guidance](https://supabase.com/docs/guides/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16).
- The founder sees delivery status; other users cannot read feedback, recipients or email delivery records.
- API acceptance does not prove delivery or verify a respondent's claimed identity.

Run `npm run test:feedback` and `npm run test:feedback-email` for isolated PostgreSQL checks. The email test uses a mock HTTP transport and never sends real messages.
