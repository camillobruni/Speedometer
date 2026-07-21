import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rawDir = path.resolve(__dirname, "../src/data-raw");

if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
}

function invertAndRoundCoordinates(coords) {
    if (Array.isArray(coords)) {
        if (coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number") {
            const lat = Number(coords[1].toFixed(6));
            const lng = Number(coords[0].toFixed(6));
            if (coords.length > 2 && typeof coords[2] === "number") {
                return [lat, lng, Number(coords[2].toFixed(6))];
            }
            return [lat, lng];
        }
        return coords.map(item => invertAndRoundCoordinates(item));
    }
    return coords;
}

function classifyRoute(feature) {
    const p = feature.properties || {};
    const classcode = String(p.classcode ?? p.CLASSCODE ?? "").trim();
    const layer = String(p.layer ?? p.LAYER ?? "").toUpperCase().trim();
    if (classcode === "1" || classcode === "2" || classcode === "6" || layer === "FREEWAYS" || layer.includes("FREEWAY") || layer.includes("HIGHWAY")) {
        return "highway";
    }
    if (classcode === "3" || layer === "ARTERIALS" || layer === "MAJOR ARTERIAL") {
        return "arterial";
    }
    if (classcode === "4" || layer === "COLLECTORS" || layer === "COLLECTOR") {
        return "collector";
    }
    if (classcode === "5" || layer === "RESIDENTIAL" || layer.includes("RESIDENTIAL")) {
        return "residential";
    }
    const name = String(p.streetname || p.street || p.name || p.STREETNAME || "").toUpperCase().trim();
    if (name.endsWith(" FWY") || name.endsWith(" HWY") || name.includes("FREEWAY") || name.includes("HIGHWAY") || name.includes("US-101") || name.includes("I-80") || name.includes("I-280")) {
        return "highway";
    }
    if (name.endsWith(" BLVD") || name.endsWith(" EXPY") || name.endsWith(" PKWY") || name.includes("EMBARCADERO") || name.includes("MARKET ST") || name.includes("MISSION ST")) {
        return "arterial";
    }
    if (name.endsWith(" AVE") || name.endsWith(" WAY") || name.endsWith(" DR")) {
        return "collector";
    }
    if (name.endsWith(" ST") || name.endsWith(" RD") || name.endsWith(" CT") || name.endsWith(" LN") || name.endsWith(" PL") || name.endsWith(" TER")) {
        return "residential";
    }
    return "alley";
}

const ROUTE_PRIORITY = { alley: 1, residential: 2, collector: 3, arterial: 4, highway: 5 };

async function fetchPageWithRetry(url, attempts = 3) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60,000ms (60-second) HTTP timeout
        try {
            const res = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; Speedometer/3.0; GIS-Acquisition)"
                },
                signal: controller.signal
            });
            if (!res.ok) {
                throw new Error(`HTTP Status ${res.status}: ${res.statusText}`);
            }
            const data = await res.json();
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.features)) return data.features;
            if (data && data.type === "FeatureCollection" && !data.features) return [];
            return [];
        } catch (err) {
            console.warn(`[Attempt ${attempt}/${attempts}] Fetch failed for ${url}: ${err.message}`);
            if (attempt === attempts) {
                throw err;
            }
            const backoffMs = Math.pow(2, attempt) * 1000;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } finally {
            clearTimeout(timeoutId);
        }
    }
    return null;
}

async function fetchSodaPaginated(baseUrl, maxRecords = 50000, pageSize = 5000) {
    const allFeatures = [];
    let offset = 0;
    while (allFeatures.length < maxRecords) {
        const currentLimit = Math.min(pageSize, maxRecords - allFeatures.length);
        const sep = baseUrl.includes("?") ? "&" : "?";
        const pageUrl = `${baseUrl}${sep}$limit=${currentLimit}&$offset=${offset}`;
        try {
            console.log(` -> Fetching SODA page: offset ${offset}, limit ${currentLimit}...`);
            const features = await fetchPageWithRetry(pageUrl, 3);
            if (!features || features.length === 0) {
                break;
            }
            allFeatures.push(...features);
            if (features.length < currentLimit) {
                break; // Reached end of paginated results
            }
            offset += features.length;
        } catch (err) {
            console.warn(`[fetchSodaPaginated] Ingestion failed at offset ${offset}: ${err.message}`);
            break;
        }
    }
    return allFeatures.length > 0 ? allFeatures : null;
}

function saveOrFallback(fileName, features, processorFn) {
    const filePath = path.join(rawDir, fileName);
    if (!features || features.length === 0) {
        if (fs.existsSync(filePath)) {
            console.log(` -> Network fetch unavailable or empty; using valid local archive at ${filePath}`);
            return;
        } else {
            throw new Error("Fatal: SODA network ingestion failed and no valid local archive exists. Synthetic fallbacks are strictly forbidden.");
        }
    }

    const processedData = processorFn(features);
    if (!processedData || processedData.length === 0) {
        if (fs.existsSync(filePath)) {
            console.log(` -> Processed features resulted in empty dataset; using valid local archive at ${filePath}`);
            return;
        } else {
            throw new Error("Fatal: SODA network ingestion failed and no valid local archive exists. Synthetic fallbacks are strictly forbidden.");
        }
    }

    const jsonStr = JSON.stringify(processedData);
    const gzipped = zlib.gzipSync(jsonStr, { level: zlib.constants.Z_BEST_COMPRESSION });
    fs.writeFileSync(filePath, gzipped);
    console.log(` -> Saved ${processedData.length} features to ${filePath} (${Math.round(gzipped.length / 1024)} KB gzipped, maximum entropy compression)`);
}

async function runIngestion() {
    console.log("Starting Authentic GIS Extraction for San Francisco (CC0 / Public Domain)...");

    console.log("1. Processing Municipal Road Network Density (3psu-pn9h)...");
    const routesFeatures = await fetchSodaPaginated("https://data.sfgov.org/resource/3psu-pn9h.geojson", 50000, 5000);
    saveOrFallback("routes.json.gz", routesFeatures, (features) => {
        const routes = [];
        for (const f of features) {
            if (!f.geometry || !f.geometry.coordinates) continue;
            const geomType = String(f.geometry.type || "").trim();
            if (geomType !== "LineString" && geomType !== "MultiLineString") continue;
            const p = f.properties || {};
            
            const statusVals = [p.active, p.ACTIVE, p.status, p.STATUS, p.lifecycle, p.LIFECYCLE, p.state, p.STATE]
                .filter(val => val !== undefined && val !== null)
                .map(val => String(val).trim().toLowerCase());
            const isExcluded = statusVals.some(val => val === "retired" || val === "abandoned" || val === "closed");
            if (isExcluded) continue;

            const streetName = p.streetname || p.street_name || p.st_name || p.street || p.name || p.fullname || p.STREETNAME || "Unnamed Street";
            routes.push({
                id: f.id || p.cnn || p.globalid || `route-${routes.length + 1}`,
                name: String(streetName).trim() || "Unnamed Street",
                type: "polyline",
                class: classifyRoute(f),
                coordinates: invertAndRoundCoordinates(f.geometry.coordinates)
            });
        }
        routes.sort((a, b) => (ROUTE_PRIORITY[a.class] || 1) - (ROUTE_PRIORITY[b.class] || 1));
        routes.forEach((r, idx) => { r.id = `route-${idx + 1}`; });
        return routes;
    });

    console.log("2. Processing Lakes & Water Bodies (xgse-mjer)...");
    const riversFeatures = await fetchSodaPaginated("https://data.sfgov.org/resource/xgse-mjer.geojson", 5000, 5000);
    saveOrFallback("rivers.json.gz", riversFeatures, (features) => {
        const rivers = [];
        for (const f of features) {
            if (!f.geometry || !f.geometry.coordinates) continue;
            const p = f.properties || {};
            const waterName = p.feature_na || p.water_name || p.name || p.body_name || p.waterbody || p.description || p.label || "Waterbody";
            const geomType = String(f.geometry.type || "").toLowerCase();
            const type = geomType.includes("polygon") ? "polygon" : "polyline";
            rivers.push({
                id: f.id || `river-${rivers.length + 1}`,
                name: String(waterName).trim() || `Waterbody ${rivers.length + 1}`,
                type: type,
                coordinates: invertAndRoundCoordinates(f.geometry.coordinates)
            });
        }
        rivers.forEach((r, idx) => { r.id = `river-${idx + 1}`; });
        return rivers;
    });

    console.log("3. Sanitizing Peaks dataset (peaks.json.gz)...");
    const peaksPath = path.join(rawDir, "peaks.json.gz");
    if (fs.existsSync(peaksPath)) {
        const compressedPeaks = fs.readFileSync(peaksPath);
        const peaksData = JSON.parse(zlib.gunzipSync(compressedPeaks).toString("utf8"));
        const sanitizedPeaks = peaksData
            .filter(item => !String(item.name || "").includes("TIGER/Line Geodetic Monument"))
            .map((item, idx) => ({ ...item, id: `peak-${idx + 1}` }));
        fs.writeFileSync(peaksPath, zlib.gzipSync(JSON.stringify(sanitizedPeaks), { level: zlib.constants.Z_BEST_COMPRESSION }));
        console.log(` -> Sanitized peaks. Retained ${sanitizedPeaks.length} genuine summits (${Math.round(fs.statSync(peaksPath).size / 1024)} KB gzipped)`);
    } else {
        throw new Error("Fatal: SODA network ingestion failed and no valid local archive exists. Synthetic fallbacks are strictly forbidden.");
    }

    console.log("4. Processing Authentic MultiPolygon Parks & Green Spaces (gtr9-ntp6)...");
    const parksFeatures = await fetchSodaPaginated("https://data.sfgov.org/resource/gtr9-ntp6.geojson", 10000, 5000);
    saveOrFallback("parks.json.gz", parksFeatures, (features) => {
        const parks = [];
        for (const f of features) {
            if (!f.geometry || !f.geometry.coordinates) continue;
            const geomType = String(f.geometry.type || "").trim();
            if (geomType !== "Polygon" && geomType !== "MultiPolygon") {
                continue; // Strictly filter for Polygon and MultiPolygon geometries
            }
            const p = f.properties || {};
            const parkName = p.map_park_n || p.map_park_name || p.parkname || p.park_name || p.name || p.NAME || p.label || "SF Park";
            parks.push({
                id: f.id || `park-${parks.length + 1}`,
                name: String(parkName).trim() || "SF Park",
                type: "polygon",
                coordinates: invertAndRoundCoordinates(f.geometry.coordinates)
            });
        }
        parks.forEach((p, idx) => { p.id = `park-${idx + 1}`; });
        return parks;
    });

    console.log("5. Processing Authentic Downtown Building Footprints (ynuv-fyni)...");
    const buildingsUrl = "https://data.sfgov.org/resource/ynuv-fyni.geojson?$where=within_box(shape, 37.808, -122.415, 37.785, -122.385)";
    const buildingsFeatures = await fetchSodaPaginated(buildingsUrl, 25000, 5000);
    saveOrFallback("buildings.json.gz", buildingsFeatures, (features) => {
        const buildings = [];
        for (const f of features) {
            const geom = f.geometry || f.shape || f.polygon;
            if (!geom || !geom.coordinates) continue;
            const geomType = String(geom.type || "").trim();
            if (geomType !== "Polygon" && geomType !== "MultiPolygon") {
                continue; // Strictly filter for Polygon and MultiPolygon geometries
            }
            const p = f.properties || f || {};
            const bldgName = p.name || p.NAME || p.building_name || p.label || "Building";
            const rawHgt = parseFloat(p.hgt_median_m ?? p.hgt_median ?? p.height ?? 15);
            const hgt = Number((isNaN(rawHgt) ? 15 : rawHgt).toFixed(2));
            buildings.push({
                id: f.id || `building-${buildings.length + 1}`,
                name: String(bldgName).trim() || "Building",
                type: "polygon",
                hgt_median_m: hgt,
                coordinates: invertAndRoundCoordinates(geom.coordinates)
            });
        }
        buildings.forEach((b, idx) => { b.id = `building-${idx + 1}`; });
        return buildings;
    });

    console.log("6. Processing Authentic Muni Transit Networks (9exe-acju)...");
    const transitFeatures = await fetchSodaPaginated("https://data.sfgov.org/resource/9exe-acju.geojson", 5000, 5000);
    saveOrFallback("transit.json.gz", transitFeatures, (features) => {
        const transit = [];
        for (const f of features) {
            if (!f.geometry || !f.geometry.coordinates) continue;
            const p = f.properties || {};
            const lineName = p.line_name || p.service_name || p.name || p.route_name || p.ROUTE || p.NAME || p.label || "Muni Line";
            const geomType = String(f.geometry.type || "").toLowerCase();
            const type = geomType.includes("polygon") ? "polygon" : "polyline";
            transit.push({
                id: f.id || `transit-${transit.length + 1}`,
                name: String(lineName).trim() || "Muni Line",
                type: type,
                coordinates: invertAndRoundCoordinates(f.geometry.coordinates)
            });
        }
        transit.forEach((t, idx) => { t.id = `transit-${idx + 1}`; });
        return transit;
    });

    console.log("Real GIS data extraction and compression completed successfully!");
}

runIngestion().catch(err => {
    console.error("Ingestion failed:", err);
    process.exit(1);
});
