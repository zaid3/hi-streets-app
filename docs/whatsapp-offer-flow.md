# WhatsApp offer publishing flow

This is the production structure for business offers in Hi-Streets.

## Goal

A verified local business can text a short offer to the Hi-Streets WhatsApp number. The app turns it into a clean offer and shows it on the map.

Example message:

```text
20% off all pizzas until 8pm
```

Published map offer:

```json
{
  "shortLabel": "20% off",
  "title": "20% off all pizzas",
  "description": "20% off all pizzas until 8pm. Show this offer in store to redeem.",
  "source": "whatsapp",
  "expiresAt": "..."
}
```

## Business verification

A business must be verified before WhatsApp publishing is allowed.

Required fields:

- Business name
- Category
- Address
- Latitude and longitude
- Google Place ID or Google Maps link
- Approved WhatsApp sender number
- Verification status

The sender number is matched against `businesses.whatsapp_phone`. If the number is not linked to a verified business, the webhook does not publish anything.

## Webhook route

The route is:

```text
/api/whatsapp
```

`GET` is used by Meta webhook verification.

`POST` receives WhatsApp messages, extracts the sender and text, checks the verified business, parses the offer, and inserts into Supabase.

Environment variable:

```bash
WHATSAPP_VERIFY_TOKEN=your_meta_webhook_verify_token
```

## Data privacy

For the MVP, do not track end users. The map can work without login.

For businesses, store only the information needed to verify the business and publish offers. Do not store unnecessary WhatsApp conversation history. Keep structured offer data and short operational logs only.

## Production checklist

- Use a real Meta WhatsApp Business Platform number.
- Configure the webhook URL in Meta Developer Dashboard.
- Store WhatsApp access tokens server-side only.
- Verify business ownership before enabling WhatsApp publishing.
- Add rate limits so businesses cannot spam offers.
- Add moderation rules for banned words, misleading claims and expired offers.
- Add a privacy notice and retention period for webhook logs.
