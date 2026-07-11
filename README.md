# HiStreets — Newham Community Map

HiStreets is a free, mobile-first community map for the London Borough of Newham only.

It shows:

- local businesses and services seeded from OpenStreetMap
- verified local offers
- Newham jobs, especially entry-level and youth-friendly opportunities
- free meals and community support
- official CPZ polygons and manually entered paid bays

The app follows the uploaded Phase 1 specification: MapLibre, no Google Maps, no ads, no paid APIs, no invented parking data, and no expansion beyond Newham.

## Stack

- React + Vite + TypeScript
- MapLibre GL JS
- OpenFreeMap vector tiles
- Supabase Postgres/PostGIS/Auth/Storage
- PWA manifest + service worker
- Docker/nginx for Coolify or any static host

## Environment variables

Frontend runtime:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Seed scripts:

```bash
SUPABASE_SERVICE_ROLE_KEY=
# plus either VITE_SUPABASE_URL or SUPABASE_URL
```

Never commit service keys or tokens.

## Database setup

Run this in Supabase SQL editor:

```bash
supabase/schema_v1.sql
```

It creates:

- profiles
- businesses
- posts
- cpz_zones
- paid_bays
- blue_badge_bays
- saved_places
- reports
- verification_events
- admin_audit_log
- RLS policies
- frontend public views
- data import RPCs
- GDPR export/delete RPCs

## Seed official/free data

Install locally:

```bash
npm install
```

Import Newham CPZ polygons from Newham ArcGIS and reproject EPSG:27700 to WGS84:

```bash
VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:cpz
```

Seed businesses/services from OpenStreetMap Overpass inside the Newham bounding box:

```bash
VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:osm-businesses
```

Paid bays are entered manually from the PayByPhone public map. Blue badge bays must only be added from official EIR/FOI data or photo-verified survey data.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Docker exposes port 3000 through nginx.

## Operator checklist

- [ ] Create Supabase project in UK/EU region
- [ ] Run `supabase/schema_v1.sql`
- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Coolify
- [ ] Run CPZ seed script
- [ ] Run OSM business seed script
- [ ] Manually enter PayByPhone paid bays
- [ ] File EIR request to Newham for disabled bay locations and TMO schedule plans
- [ ] Email AppyWay asking about a donated community licence
- [ ] Complete ICO data protection fee self-assessment

## Hard rules

- No Google Maps or Google Places data
- No fake businesses, offers, jobs, meals or parking
- No estimated blue badge bays
- No trackers, ads or monetisation
- No map expansion beyond Newham
