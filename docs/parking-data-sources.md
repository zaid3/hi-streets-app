# Parking data source strategy

Hi-Streets must never draw fake legal street parking. Parking data should be shown with a source and confidence level.

## Source priority

1. Council open parking bay datasets
   - Highest practical confidence when the council publishes bay geometry, restriction type, operating times, tariff, max stay and CPZ.
   - First live connector: London Borough of Camden Parking Bays dataset.

2. DfT Digital TRO service
   - National long-term source for digital Traffic Regulation Order extracts.
   - The DfT says the service provides machine-readable D-TRO data through an API and is free to use after registration.
   - Keep API credentials server-side. Do not expose D-TRO tokens in the browser.

3. Google Places parking
   - Good for off-street parking places and car parks.
   - Not enough for exact legal on-street bay restrictions.

4. OpenStreetMap and Overpass
   - Useful community fallback for mapped parking features.
   - Show as medium confidence and ask users to check signs.

5. Starter coverage
   - Only for MVP coverage and demos in known areas.
   - Must be labelled clearly and should be replaced by council, D-TRO or verified field data.

## Adding a new council

1. Find the council parking bay or TRO open dataset.
2. Confirm licence allows reuse, ideally Open Government Licence or similar.
3. Add a source entry in `lib/councilParkingSources.js`.
4. Add a normaliser function that maps rows into the app parking shape:

```js
{
  id,
  type,
  color,
  coords,
  lat,
  lng,
  name,
  restriction,
  hours,
  maxStay,
  tariff,
  cpz,
  source: 'council',
  sourceName,
  council,
  confidence: 'high',
  dataNote,
}
```

5. Add it to `/api/parking/council/route.js` through `normaliseCouncilRows`.
6. Test the area on the map and compare random results against street signs.

## D-TRO production path

When D-TRO API access is registered:

1. Add server environment variables only:

```bash
D_TRO_API_BASE_URL=
D_TRO_API_KEY=
```

2. Create a server route such as `/api/parking/dtro`.
3. Convert D-TRO measures into the same parking shape used by council sources.
4. Merge D-TRO data before OSM and Google fallback.
5. Keep source labels visible in the UI.

## User trust rule

Every parking result must answer:

- What is it?
- Can I park now?
- How long can I stay?
- Where did this data come from?
- How confident is the app?

If we cannot answer these honestly, show a warning and do not pretend the data is exact.
