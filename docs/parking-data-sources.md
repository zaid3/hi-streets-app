# Parking data source strategy

Hi-Streets must never draw fake legal street parking. Parking data should be shown with a source and confidence level.

## Source priority

1. Verified parking segments in Supabase
   - This is the production store for road-by-road bay data.
   - Use this for council imports, D-TRO imports, FOI/open-data imports and field-checked bays.
   - Only rows with `is_verified = true` are shown publicly.

2. Council open parking bay datasets
   - Highest practical confidence when the council publishes bay geometry, restriction type, operating times, tariff, max stay and CPZ.
   - First live connector: London Borough of Camden Parking Bays dataset.

3. DfT Digital TRO service
   - National long-term source for digital Traffic Regulation Order extracts.
   - The DfT says the service provides machine-readable D-TRO data through an API and is free to use after registration.
   - Keep API credentials server-side. Do not expose D-TRO tokens in the browser.

4. Google Places parking
   - Good for off-street parking places and car parks.
   - Not enough for exact legal on-street bay restrictions.

5. OpenStreetMap and Overpass
   - Useful community fallback for mapped parking features.
   - Show as medium confidence and ask users to check signs.

6. Starter coverage
   - Only for early known-area coverage.
   - Must be labelled clearly and should be replaced by council, D-TRO or verified field data.

## Parking segment shape

Imported parking data should be stored in `public.parking_segments`:

```js
{
  external_id,
  type,
  color,
  coords,
  lat,
  lng,
  name,
  restriction,
  hours,
  max_stay,
  tariff,
  cpz,
  spaces,
  length,
  is_car_park,
  source,
  source_name,
  council,
  confidence,
  data_note,
  is_verified
}
```

Use `source = 'dtro'` for D-TRO imports, `source = 'council'` for council open-data imports and `source = 'field_checked'` for manually verified streets.

## Camden import endpoint

The app includes a protected import route:

```text
POST /api/admin/import-camden-parking
Authorization: Bearer <ADMIN_IMPORT_TOKEN>
```

Required server environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_IMPORT_TOKEN=
```

The import writes Camden parking bay rows into `parking_segments` with `is_verified = false`. Review sample streets first, then approve checked rows by setting `is_verified = true` in Supabase.

## D-TRO import endpoint

The app includes a protected D-TRO import route:

```text
POST /api/admin/import-dtro-parking
Authorization: Bearer <ADMIN_IMPORT_TOKEN>
```

Required server environment variables:

```bash
D_TRO_APP_ID=
D_TRO_API_KEY=
D_TRO_SECRET_KEY=
D_TRO_API_BASE_URL=https://dtro.dft.gov.uk/v1
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_IMPORT_TOKEN=
```

The D-TRO client uses OAuth2 client credentials against `/oauth-generator`, then reads D-TROs using a bearer token. The API key and secret must stay server-side only.

Dry run one known D-TRO ID:

```bash
curl -X POST https://YOUR_DOMAIN/api/admin/import-dtro-parking \
  -H "Authorization: Bearer YOUR_ADMIN_IMPORT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true,"dtroId":"D_TRO_ID_HERE"}'
```

Import a small batch of parking-like D-TROs:

```bash
curl -X POST https://YOUR_DOMAIN/api/admin/import-dtro-parking \
  -H "Authorization: Bearer YOUR_ADMIN_IMPORT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pages":1,"pageSize":25}'
```

The import writes rows with `is_verified = false`. Review streets in Supabase first, then approve known-good rows:

```sql
update public.parking_segments
set is_verified = true
where source = 'dtro'
  and council = 'YOUR_COUNCIL_OR_AUTHORITY'
  and is_verified = false;
```

Do not bulk-approve national D-TRO rows without checking samples. D-TRO geometry is legal-order geometry, and the app must not display unchecked restrictions as certain bay availability.

## Adding a new council

1. Find the council parking bay or TRO open dataset.
2. Confirm licence allows reuse, ideally Open Government Licence or similar.
3. Add a source entry in `lib/councilParkingSources.js`.
4. Add a normaliser function that maps rows into the app parking shape.
5. Add a protected admin import route or scheduled job.
6. Test the area on the map and compare random results against street signs.
7. For long-term performance, import verified rows into `parking_segments` instead of relying only on live fetches.

## User trust rule

Every parking result must answer:

- What is it?
- Can I park now?
- How long can I stay?
- Where did this data come from?
- How confident is the app?

If we cannot answer these honestly, show a warning and do not pretend the data is exact.
