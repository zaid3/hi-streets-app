# Hi-Streets UK

Hi-Streets UK is a mobile-first parking and local offers map.

The MVP combines:

- Zone, bay and list views for parking discovery
- Parking bay, paid bay, disabled bay, EV bay, loading bay, resident bay, yellow line, red route and no-parking visual states
- Destination search, planned arrival time and parking duration
- Bottom sheets for operating hours, walking time, payment, no-return and directions
- Live local business offers shown directly on the map
- Business portal for posting offers through an AI assistant
- WhatsApp webhook route for verified businesses to text offers into the platform
- Optional Google Maps rendering when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is configured, with MapLibre fallback

## Privacy-first MVP approach

The public parking map can be used without an account. Browser location is used to centre the map and is not stored by the app in the MVP.

Business-side data is kept intentionally small:

- Business name
- Address
- Phone or approved WhatsApp sender
- Optional website
- Google Place ID or Maps link
- Offer content and expiry time

The WhatsApp flow is designed so raw customer data is not needed. A business sends an offer from an approved number, the server parses the offer, and only the structured offer is published to the map.

Before production, add a proper privacy notice, cookie notice if analytics are added, and a retention policy for business messages and logs.

## Business verification flow

For the MVP, verification is simple:

1. Business enters name, address, phone, category and Google Place ID or Maps link.
2. Admin or automated check confirms the business exists and matches the submitted details.
3. Approved WhatsApp sender is linked to that business.
4. Only verified businesses can publish WhatsApp offers.

This keeps the product trustworthy without asking customers to create accounts or share unnecessary personal data.

## Environment variables

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
WHATSAPP_VERIFY_TOKEN=
```

Optional WhatsApp production credentials can be added when the Meta WhatsApp Business Platform app is configured.

## Development

```bash
npm install
npm run dev
```

## Notes

The current parking data contains Newham demo seed data and adapter-based loading. Production should connect to verified council, operator or commercial kerbside datasets before public launch.
