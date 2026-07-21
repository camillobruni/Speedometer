# San Francisco Vector Mapping Layer Catalog & Provenance

This document serves as the canonical authoritative source and technical specification for the six compressed GIS vector mapping layers bundled in `src/data/` for the Speedometer Leaflet workload.

## 1. Dataset Layer Manifest

All datasets represent authenticated geographic features within the City and County of San Francisco and U.S. Census Bureau geodetic surveys:

| Dataset File | Data Source & SODA Endpoint | Geometry & Feature Description |
| :--- | :--- | :--- |
| `routes.json.gz` | San Francisco Municipal Road Network Density (DataSF `3psu-pn9h`) | LineString / MultiLineString vector road alignments classified by functional hierarchy. |
| `buildings.json.gz` | Authentic Downtown Building Footprints (DataSF `ynuv-fyni`) | Polygon / MultiPolygon structural footprints in the downtown bounding box, enriched with median height telemetry (`hgt_median_m`). |
| `parks.json.gz` | Authentic MultiPolygon Parks & Green Spaces (DataSF `gtr9-ntp6`) | Polygon / MultiPolygon geometries representing public parks, plazas, and municipal recreation spaces. |
| `transit.json.gz` | Authentic Muni Transit Networks (DataSF `9exe-acju`) | Polyline and Polygon transit corridors representing San Francisco Muni bus, streetcar, and metro routes. |
| `rivers.json.gz` | Lakes & Water Bodies (DataSF `xgse-mjer`) | Polyline and Polygon aquatic boundaries representing natural and artificial water bodies and reservoir coastlines. |
| `peaks.json.gz` | U.S. Census Bureau TIGER/Line Geodetic Surveys | Sanified geographic summit markers with verified elevation metadata (excluding synthetic monument checkpoints). |

## 2. Road Size Coloring & Hierarchical Classifications

To ensure visual clarity and performance during rendering reflows, `routes.json.gz` categorizes segments into functional road hierarchy classifications:
- **`highway`**: Controlled-access freeways and interstate highways (e.g., US-101, I-80, I-280, and features ending in `FWY` or `HWY`). Rendered with maximum line weight and distinct highway styling.
- **`arterial`**: Major urban arterial thoroughfares (e.g., Market St, Mission St, Embarcadero, and parkways/boulevards). Rendered with high line weight and arterial prominence.
- **`collector`**: Commercial and neighborhood collector roads (e.g., avenues, drives, and ways) connecting residential streets to arterial thoroughfares.
- **`residential`**: Standard local access streets and neighborhood roads (e.g., streets, roads, courts, lanes, places, and terraces).
- **`alley`**: Narrow service roads and pedestrian alleyways.
- **`default`**: Unclassified or auxiliary access routes.

Rendering priority order guarantees that major highways and arterials are layered cleanly above local collectors and residential streets without occlusion or rendering z-fighting.

## 3. Technical Preprocessing & Compression Specification

During ingestion and repository packaging, all geometric coordinates undergo three deterministic transformations:
1. **Coordinate Inversion (`[lng, lat]` $\to$ `[lat, lng]`)**: Standard GeoJSON coordinate tuples (`[longitude, latitude]`) are inverted during extraction to align with standard Leaflet and WGS 84 geographic coordinate system ordering (`[latitude, longitude]`), eliminating runtime projection transposition overhead.
2. **6-Decimal Fixed Rounding (~10cm Resolution)**: All floating-point latitude and longitude values are strictly quantized and rounded to exactly 6 decimal places (`Number(val.toFixed(6))`). This precision standardizes spatial resolution to approximately 10 centimeters in the physical world, stripping extraneous floating-point decimals to optimize data density and memory efficiency.
3. **Maximum Entropy Gzip Compression**: After quantization, each JSON feature collection is synchronously compressed into a Deflate gzip archive (`.json.gz`) at maximum entropy compression (`zlib.constants.Z_BEST_COMPRESSION`). At runtime, these archives are fetched and expanded in memory during Speedometer's untimed setup phase (`prepare(page)`) using the browser's native W3C `DecompressionStream("gzip")` API, drastically reducing script bundle weight and disk storage requirements.
