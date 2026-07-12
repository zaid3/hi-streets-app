-- Download Newham Overture Places as GeoJSON.
-- Requires DuckDB CLI with spatial and httpfs extensions.
-- Output: data/overture-newham-places.geojson
-- Source: Overture Maps release 2026-06-17.0, places/place.

INSTALL spatial;
INSTALL httpfs;
LOAD spatial;
LOAD httpfs;
SET s3_region='us-west-2';

COPY (
  SELECT
    id,
    version,
    CAST(names AS JSON) AS names,
    CAST(categories AS JSON) AS categories,
    confidence,
    CAST(websites AS JSON) AS websites,
    CAST(socials AS JSON) AS socials,
    CAST(emails AS JSON) AS emails,
    CAST(phones AS JSON) AS phones,
    CAST(brand AS JSON) AS brand,
    CAST(addresses AS JSON) AS addresses,
    CAST(sources AS JSON) AS sources,
    geometry AS geometry
  FROM read_parquet('s3://overturemaps-us-west-2/release/2026-06-17.0/theme=places/type=place/*')
  WHERE
    bbox.xmin BETWEEN -0.030 AND 0.100
    AND bbox.ymin BETWEEN 51.490 AND 51.565
    AND confidence >= 0.55
) TO 'data/overture-newham-places.geojson'
WITH (FORMAT GDAL, DRIVER 'GeoJSON', SRS 'EPSG:4326');
