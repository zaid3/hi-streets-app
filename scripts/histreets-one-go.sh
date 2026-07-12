#!/usr/bin/env bash
set -u

printf '\nHiStreets one-go data runner\n'
printf '=============================\n\n'

if [ -z "${VITE_SUPABASE_URL:-}" ]; then
  echo "Missing VITE_SUPABASE_URL. Example:"
  echo "export VITE_SUPABASE_URL=\"https://bbfmrxefabmhtlshgemu.supabase.co\""
  exit 1
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Missing SUPABASE_SERVICE_ROLE_KEY. Export it in this terminal only before running."
  echo "Never put the service role key in the repo or frontend env."
  exit 1
fi

if [ ! -f "scripts/seed-osm-businesses.ts" ]; then
  echo "Run this from the app project folder where package.json and scripts/ exist."
  exit 1
fi

printf 'Step 1/3: OSM rich business import...\n'
npm run seed:osm-businesses
OSM_STATUS=$?
if [ $OSM_STATUS -ne 0 ]; then
  echo "OSM import failed. Stopping before enrichment."
  exit $OSM_STATUS
fi

printf '\nStep 2/3: Overture file check/download...\n'
mkdir -p data
if [ -f "data/overture-newham-places.geojson" ]; then
  echo "Found data/overture-newham-places.geojson"
else
  if command -v duckdb >/dev/null 2>&1; then
    echo "DuckDB found. Downloading/extracting Newham Overture Places..."
    duckdb < scripts/download-overture-newham.duckdb.sql
    DUCK_STATUS=$?
    if [ $DUCK_STATUS -ne 0 ]; then
      echo "DuckDB Overture download failed. OSM import is still complete."
      exit $DUCK_STATUS
    fi
  else
    echo "DuckDB is not installed in this environment."
    echo "OSM import is complete, but Overture enrichment is skipped."
    echo "Install DuckDB or create data/overture-newham-places.geojson, then rerun this script."
    exit 2
  fi
fi

printf '\nStep 3/3: Overture enrichment import...\n'
npm run seed:overture-places
OVERTURE_STATUS=$?
if [ $OVERTURE_STATUS -ne 0 ]; then
  echo "Overture enrichment failed. OSM import is still complete."
  exit $OVERTURE_STATUS
fi

printf '\nComplete. Removing service role key from this shell...\n'
unset SUPABASE_SERVICE_ROLE_KEY
printf 'SUPABASE_SERVICE_ROLE_KEY is now unset for this process.\n\n'
printf 'Run this SQL check in Supabase:\n\n'
cat <<'SQL'
select
  count(*) as total_businesses,
  count(*) filter (where address is not null and address <> '') as with_address,
  count(*) filter (where phone is not null and phone <> '') as with_phone,
  count(*) filter (where website is not null and website <> '') as with_website,
  count(*) filter (where email is not null and email <> '') as with_email,
  count(*) filter (where brand is not null and brand <> '') as with_brand,
  count(*) filter (where overture_id is not null) as matched_overture
from businesses;
SQL
