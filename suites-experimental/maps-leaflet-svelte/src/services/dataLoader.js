import L from "leaflet";
import { THEME_COLORS, ROAD_STYLES } from "../theme/colors.js";
import { layerStats } from "../stores/mapStore.js";
import routesGzUrl from "../data/routes.json.gz?url";
import riversGzUrl from "../data/rivers.json.gz?url";
import peaksGzUrl from "../data/peaks.json.gz?url";
import parksGzUrl from "../data/parks.json.gz?url";
import buildingsGzUrl from "../data/buildings.json.gz?url";
import transitGzUrl from "../data/transit.json.gz?url";

export let rawBuffers = { routes: null, rivers: null, peaks: null, parks: null, buildings: null, transit: null };

let routesData = null;
let riversData = null;
let peaksData = null;
let parksData = null;
let buildingsData = null;
let transitData = null;

let sharedRenderer = null;
function getSharedRenderer() {
    if (!sharedRenderer)
        sharedRenderer = L.canvas({ padding: 0.05 });
    return sharedRenderer;
}

export function resetSharedRenderer() {
    sharedRenderer = null;
}

function countVertices(coords) {
    if (!Array.isArray(coords))
        return 0;
    if (coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number")
        return 1;

    return coords.reduce((sum, item) => sum + countVertices(item), 0);
}

export function computeLayerStats(data) {
    if (!Array.isArray(data))
        return { features: 0, vertices: 0 };
    let vertices = 0;
    for (const item of data)
        vertices += countVertices(item.coordinates);

    return {
        features: data.length,
        vertices
    };
}

export async function loadRawBuffers() {
    if (rawBuffers.routes && rawBuffers.rivers && rawBuffers.peaks && rawBuffers.parks && rawBuffers.buildings && rawBuffers.transit)
        return;
    const fetchBuffer = async (url) => {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`Failed to load dataset: ${url}`);
        return await response.arrayBuffer();
    };
    const [routes, rivers, peaks, parks, buildings, transit] = await Promise.all([
        fetchBuffer(routesGzUrl),
        fetchBuffer(riversGzUrl),
        fetchBuffer(peaksGzUrl),
        fetchBuffer(parksGzUrl),
        fetchBuffer(buildingsGzUrl),
        fetchBuffer(transitGzUrl)
    ]);
    rawBuffers = { routes, rivers, peaks, parks, buildings, transit };
}

async function decompressAndParseBuffer(buffer) {
    if (!buffer)
        return [];
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
        return await new Response(stream).json();
    }
    return JSON.parse(new TextDecoder().decode(buffer));
}

export async function decompressAndParseDatasets() {
    const [routes, rivers, peaks, parks, buildings, transit] = await Promise.all([
        decompressAndParseBuffer(rawBuffers.routes),
        decompressAndParseBuffer(rawBuffers.rivers),
        decompressAndParseBuffer(rawBuffers.peaks),
        decompressAndParseBuffer(rawBuffers.parks),
        decompressAndParseBuffer(rawBuffers.buildings),
        decompressAndParseBuffer(rawBuffers.transit)
    ]);
    routesData = routes;
    riversData = rivers;
    peaksData = peaks;
    parksData = parks;
    buildingsData = buildings;
    transitData = transit;

    layerStats.set({
        routes: computeLayerStats(routesData),
        rivers: computeLayerStats(riversData),
        peaks: computeLayerStats(peaksData),
        parks: computeLayerStats(parksData),
        buildings: computeLayerStats(buildingsData),
        transit: computeLayerStats(transitData)
    });
}

export function resetParsedDatasets() {
    routesData = null;
    riversData = null;
    peaksData = null;
    parksData = null;
    transitData = null;
    resetSharedRenderer();


    layerStats.set({
        routes: { features: 0, vertices: 0 },
        rivers: { features: 0, vertices: 0 },
        peaks: { features: 0, vertices: 0 },
        parks: { features: 0, vertices: 0 },
        buildings: { features: 0, vertices: 0 },
        transit: { features: 0, vertices: 0 }
    });
}

export function getRoutesData() {
    return routesData;
}
export function getRiversData() {
    return riversData;
}
export function getPeaksData() {
    return peaksData;
}
export function getParksData() {
    return parksData;
}
export function getBuildingsData() {
    return buildingsData;
}
export function getTransitData() {
    return transitData;
}

export function createRouteLayerGroup() {
    const renderer = getSharedRenderer();
    const optionsByClass = Object.freeze({
        highway: Object.freeze({ renderer, color: ROAD_STYLES.highway.color, weight: ROAD_STYLES.highway.weight, opacity: ROAD_STYLES.highway.opacity, interactive: false, smoothFactor: 2.0 }),
        arterial: Object.freeze({ renderer, color: ROAD_STYLES.arterial.color, weight: ROAD_STYLES.arterial.weight, opacity: ROAD_STYLES.arterial.opacity, interactive: false, smoothFactor: 2.0 }),
        collector: Object.freeze({ renderer, color: ROAD_STYLES.collector.color, weight: ROAD_STYLES.collector.weight, opacity: ROAD_STYLES.collector.opacity, interactive: false, smoothFactor: 2.0 }),
        residential: Object.freeze({ renderer, color: ROAD_STYLES.residential.color, weight: ROAD_STYLES.residential.weight, opacity: ROAD_STYLES.residential.opacity, interactive: false, smoothFactor: 2.0 }),
        alley: Object.freeze({ renderer, color: ROAD_STYLES.alley.color, weight: ROAD_STYLES.alley.weight, opacity: ROAD_STYLES.alley.opacity, interactive: false, smoothFactor: 2.0 }),
        default: Object.freeze({ renderer, color: ROAD_STYLES.default.color, weight: ROAD_STYLES.default.weight, opacity: ROAD_STYLES.default.opacity, interactive: false, smoothFactor: 2.0 })
    });
    const coordsByClass = {
        highway: [],
        arterial: [],
        collector: [],
        residential: [],
        alley: [],
        default: []
    };
    for (const route of (routesData || [])) {
        const cls = Object.prototype.hasOwnProperty.call(coordsByClass, route.class) ? route.class : "default";
        coordsByClass[cls].push(route.coordinates);
    }
    const layers = [];
    for (const [cls, coords] of Object.entries(coordsByClass)) {
        if (coords.length > 0) {
            layers.push(L.polyline(coords, optionsByClass[cls]));
        }
    }
    return L.layerGroup(layers);
}

export function createRiverLayerGroup() {
    const renderer = getSharedRenderer();
    const polygonOptions = Object.freeze({
        renderer: renderer,
        color: THEME_COLORS.river,
        fillColor: THEME_COLORS.river,
        fillOpacity: 0.4,
        weight: 1.5,
        interactive: false,
        smoothFactor: 2.0
    });
    const polylineOptions = Object.freeze({
        renderer: renderer,
        color: THEME_COLORS.river,
        weight: 2.5,
        opacity: 0.8,
        interactive: false,
        smoothFactor: 2.0
    });
    const polygons = [];
    const polylines = [];
    for (const feature of (riversData || [])) {
        if (feature.type === "polygon")
            polygons.push(feature.coordinates);
        else
            polylines.push(feature.coordinates);
    }
    const layers = [];
    if (polygons.length > 0)
        layers.push(L.polygon(polygons, polygonOptions));
    if (polylines.length > 0)
        layers.push(L.polyline(polylines, polylineOptions));
    return L.layerGroup(layers);
}

export function createPeakLayerGroup() {
    const renderer = getSharedRenderer();
    const markerOptions = Object.freeze({
        renderer: renderer,
        color: THEME_COLORS.peak,
        fillColor: THEME_COLORS.peak,
        fillOpacity: 0.9,
        radius: 5,
        weight: 1,
        interactive: true
    });
    const tooltipOptions = Object.freeze({
        permanent: false,
        direction: "top"
    });
    const layers = (peaksData || []).map(peak => {
        const marker = L.circleMarker(peak.coordinates, markerOptions);
        marker.bindTooltip(`${peak.name} (${peak.elevation}m)`, tooltipOptions);
        return marker;
    });
    return L.layerGroup(layers);
}

export function createParkLayerGroup() {
    const renderer = getSharedRenderer();
    const options = Object.freeze({
        renderer,
        color: "#2e8b57",
        fillColor: THEME_COLORS.park,
        fillOpacity: 0.35,
        weight: 1.5,
        interactive: false,
        smoothFactor: 2.0
    });
    const polygons = [];
    const polylines = [];
    for (const park of (parksData || [])) {
        if (park.type === "polygon")
            polygons.push(park.coordinates);
        else
            polylines.push(park.coordinates);
    }
    const layers = [];
    if (polygons.length > 0)
        layers.push(L.polygon(polygons, options));
    if (polylines.length > 0)
        layers.push(L.polyline(polylines, options));
    return L.layerGroup(layers);
}

export function createBuildingLayerGroup() {
    const renderer = getSharedRenderer();
    const normalBuckets = Array.from({ length: 20 }, (_, i) => Object.freeze({
        renderer,
        color: THEME_COLORS.border,
        fillColor: THEME_COLORS.building,
        fillOpacity: Math.round((0.20 + (i / 19) * 0.75) * 100) / 100,
        weight: 1,
        interactive: false,
        smoothFactor: 2.0
    }));
    const tallBuckets = Array.from({ length: 20 }, (_, i) => Object.freeze({
        renderer,
        color: THEME_COLORS.border,
        fillColor: THEME_COLORS.buildingTall,
        fillOpacity: Math.round((0.20 + (i / 19) * 0.75) * 100) / 100,
        weight: 1,
        interactive: false,
        smoothFactor: 2.0
    }));

    const normalPolys = Array.from({ length: 20 }, () => ({ polygons: [], polylines: [] }));
    const tallPolys = Array.from({ length: 20 }, () => ({ polygons: [], polylines: [] }));

    for (const building of (buildingsData || [])) {
        const height = Number(building.hgt_median_m || 15);
        const bucketIdx = Math.min(19, Math.max(0, Math.floor(((height - 10) / 190) * 20)));
        const target = height > 60 ? tallPolys[bucketIdx] : normalPolys[bucketIdx];
        if (building.type === "polygon") {
            target.polygons.push(building.coordinates);
        } else {
            target.polylines.push(building.coordinates);
        }
    }

    const layers = [];
    for (let i = 0; i < 20; i++) {
        if (normalPolys[i].polygons.length > 0)
            layers.push(L.polygon(normalPolys[i].polygons, normalBuckets[i]));
        if (normalPolys[i].polylines.length > 0)
            layers.push(L.polyline(normalPolys[i].polylines, normalBuckets[i]));
        if (tallPolys[i].polygons.length > 0)
            layers.push(L.polygon(tallPolys[i].polygons, tallBuckets[i]));
        if (tallPolys[i].polylines.length > 0)
            layers.push(L.polyline(tallPolys[i].polylines, tallBuckets[i]));
    }

    return L.layerGroup(layers);
}

export function createTransitLayerGroup() {
    const renderer = getSharedRenderer();
    const options = Object.freeze({
        renderer,
        color: THEME_COLORS.transit,
        weight: 2.8,
        opacity: 0.85,
        dashArray: "5, 5",
        interactive: false,
        smoothFactor: 2.0
    });
    const polygons = [];
    const polylines = [];
    for (const line of (transitData || [])) {
        if (line.type === "polygon")
            polygons.push(line.coordinates);
        else
            polylines.push(line.coordinates);
    }
    const layers = [];
    if (polygons.length > 0)
        layers.push(L.polygon(polygons, options));
    if (polylines.length > 0)
        layers.push(L.polyline(polylines, options));
    return L.layerGroup(layers);
}
