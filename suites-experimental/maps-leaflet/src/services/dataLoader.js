import L from "leaflet";
import { THEME_COLORS, ROAD_STYLES } from "../theme/colors.js";
import routesGzUrl from "../data/routes.json.gz?url";
import riversGzUrl from "../data/rivers.json.gz?url";
import peaksGzUrl from "../data/peaks.json.gz?url";
import parksGzUrl from "../data/parks.json.gz?url";
import buildingsGzUrl from "../data/buildings.json.gz?url";
import transitGzUrl from "../data/transit.json.gz?url";

async function fetchAndDecompressJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load dataset: ${url}`);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let text;
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
        text = await new Response(stream).text();
    } else {
        text = new TextDecoder().decode(buffer);
    }
    return JSON.parse(text);
}

let routesData = [];
let riversData = [];
let peaksData = [];
let parksData = [];
let buildingsData = [];
let transitData = [];

function countVertices(coords) {
    if (!Array.isArray(coords)) return 0;
    if (coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number") {
        return 1;
    }
    return coords.reduce((sum, item) => sum + countVertices(item), 0);
}

export function computeLayerStats(data) {
    if (!Array.isArray(data)) return { features: 0, vertices: 0 };
    let vertices = 0;
    for (const item of data) {
        vertices += countVertices(item.coordinates);
    }
    return {
        features: data.length,
        vertices
    };
}

export let routesStats = { features: 0, vertices: 0 };
export let riversStats = { features: 0, vertices: 0 };
export let peaksStats = { features: 0, vertices: 0 };
export let parksStats = { features: 0, vertices: 0 };
export let buildingsStats = { features: 0, vertices: 0 };
export let transitStats = { features: 0, vertices: 0 };

export async function initializeDatasets() {
    const [routes, rivers, peaks, parks, buildings, transit] = await Promise.all([
        fetchAndDecompressJson(routesGzUrl),
        fetchAndDecompressJson(riversGzUrl),
        fetchAndDecompressJson(peaksGzUrl),
        fetchAndDecompressJson(parksGzUrl),
        fetchAndDecompressJson(buildingsGzUrl),
        fetchAndDecompressJson(transitGzUrl)
    ]);
    routesData = routes;
    riversData = rivers;
    peaksData = peaks;
    parksData = parks;
    buildingsData = buildings;
    transitData = transit;

    routesStats = computeLayerStats(routesData);
    riversStats = computeLayerStats(riversData);
    peaksStats = computeLayerStats(peaksData);
    parksStats = computeLayerStats(parksData);
    buildingsStats = computeLayerStats(buildingsData);
    transitStats = computeLayerStats(transitData);
}

export function getRoutesData() { return routesData; }
export function getRiversData() { return riversData; }
export function getPeaksData() { return peaksData; }
export function getParksData() { return parksData; }
export function getBuildingsData() { return buildingsData; }
export function getTransitData() { return transitData; }

export function createRouteLayerGroup() {
    const renderer = L.canvas({ padding: 0.5 });
    const optionsByClass = Object.freeze({
        highway:     Object.freeze({ renderer, color: ROAD_STYLES.highway.color,     weight: ROAD_STYLES.highway.weight,     opacity: ROAD_STYLES.highway.opacity,     interactive: false }),
        arterial:    Object.freeze({ renderer, color: ROAD_STYLES.arterial.color,    weight: ROAD_STYLES.arterial.weight,    opacity: ROAD_STYLES.arterial.opacity,    interactive: false }),
        collector:   Object.freeze({ renderer, color: ROAD_STYLES.collector.color,   weight: ROAD_STYLES.collector.weight,   opacity: ROAD_STYLES.collector.opacity,   interactive: false }),
        residential: Object.freeze({ renderer, color: ROAD_STYLES.residential.color, weight: ROAD_STYLES.residential.weight, opacity: ROAD_STYLES.residential.opacity, interactive: false }),
        alley:       Object.freeze({ renderer, color: ROAD_STYLES.alley.color,       weight: ROAD_STYLES.alley.weight,       opacity: ROAD_STYLES.alley.opacity,       interactive: false }),
        default:     Object.freeze({ renderer, color: ROAD_STYLES.default.color,     weight: ROAD_STYLES.default.weight,     opacity: ROAD_STYLES.default.opacity,     interactive: false })
    });
    const layers = routesData.map(route => L.polyline(route.coordinates, optionsByClass[route.class] || optionsByClass.default));
    return L.layerGroup(layers);
}

export function createRiverLayerGroup() {
    const renderer = L.canvas({ padding: 0.5 });
    const polygonOptions = Object.freeze({
        renderer: renderer,
        color: THEME_COLORS.river,
        fillColor: THEME_COLORS.river,
        fillOpacity: 0.4,
        weight: 1.5,
        interactive: false
    });
    const polylineOptions = Object.freeze({
        renderer: renderer,
        color: THEME_COLORS.river,
        weight: 2.5,
        opacity: 0.8,
        interactive: false
    });
    const layers = riversData.map(feature => {
        if (feature.type === "polygon") {
            return L.polygon(feature.coordinates, polygonOptions);
        } else {
            return L.polyline(feature.coordinates, polylineOptions);
        }
    });
    return L.layerGroup(layers);
}

export function createPeakLayerGroup() {
    const renderer = L.canvas({ padding: 0.5 });
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
    const layers = peaksData.map(peak => {
        const marker = L.circleMarker(peak.coordinates, markerOptions);
        marker.bindTooltip(`${peak.name} (${peak.elevation}m)`, tooltipOptions);
        return marker;
    });
    return L.layerGroup(layers);
}

export function createParkLayerGroup() {
    const renderer = L.canvas({ padding: 0.5 });
    const options = Object.freeze({
        renderer,
        color: "#2e8b57",
        fillColor: THEME_COLORS.park,
        fillOpacity: 0.35,
        weight: 1.5,
        interactive: false
    });
    const layers = parksData.map(park => {
        return park.type === "polygon" ? L.polygon(park.coordinates, options) : L.polyline(park.coordinates, options);
    });
    return L.layerGroup(layers);
}

export function createBuildingLayerGroup() {
    const renderer = L.canvas({ padding: 0.5 });
    const normalBuckets = Array.from({ length: 20 }, (_, i) => Object.freeze({
        renderer,
        color: THEME_COLORS.border,
        fillColor: THEME_COLORS.building,
        fillOpacity: Math.round((0.20 + (i / 19) * 0.75) * 100) / 100,
        weight: 1,
        interactive: false
    }));
    const tallBuckets = Array.from({ length: 20 }, (_, i) => Object.freeze({
        renderer,
        color: THEME_COLORS.border,
        fillColor: THEME_COLORS.buildingTall,
        fillOpacity: Math.round((0.20 + (i / 19) * 0.75) * 100) / 100,
        weight: 1,
        interactive: false
    }));

    const layers = buildingsData.map(building => {
        const height = Number(building.hgt_median_m || 15);
        const bucketIdx = Math.min(19, Math.max(0, Math.floor(((height - 10) / 190) * 20)));
        const options = height > 60 ? tallBuckets[bucketIdx] : normalBuckets[bucketIdx];
        return building.type === "polygon" ? L.polygon(building.coordinates, options) : L.polyline(building.coordinates, options);
    });
    return L.layerGroup(layers);
}

export function createTransitLayerGroup() {
    const renderer = L.canvas({ padding: 0.5 });
    const options = Object.freeze({
        renderer,
        color: THEME_COLORS.transit,
        weight: 2.8,
        opacity: 0.85,
        dashArray: "5, 5",
        interactive: false
    });
    const layers = transitData.map(line => {
        return line.type === "polygon" ? L.polygon(line.coordinates, options) : L.polyline(line.coordinates, options);
    });
    return L.layerGroup(layers);
}
