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

export function assertValidDataset(dataset, datasetName) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
        throw new Error(`Fatal: Dataset ${datasetName} is invalid or empty.`);
    }
}

export class VectorLayerBatchBuilder {
    constructor(dataset) {
        this.polygons = [];
        this.polylines = [];
        this._bucketCoordinates(dataset);
    }

    _bucketCoordinates(dataset) {
        for (let featureIndex = 0; featureIndex < dataset.length; featureIndex++) {
            const feature = dataset[featureIndex];
            if (feature.type === "polygon") {
                this.polygons.push(feature.coordinates);
            } else {
                this.polylines.push(feature.coordinates);
            }
        }
    }

    buildLayers(polygonOptions, polylineOptions = polygonOptions) {
        const layers = [];
        if (this.polygons.length > 0)
            layers.push(L.polygon(this.polygons, polygonOptions));
        if (this.polylines.length > 0)
            layers.push(L.polyline(this.polylines, polylineOptions));
        return layers;
    }
}

function countVertices(coords) {
    if (!Array.isArray(coords))
        return 0;
    if (coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number")
        return 1;

    let totalVertices = 0;
    for (let coordinateIndex = 0; coordinateIndex < coords.length; coordinateIndex++) {
        totalVertices += countVertices(coords[coordinateIndex]);
    }
    return totalVertices;
}

export function computeLayerStats(data) {
    assertValidDataset(data, "computeLayerStats input");
    let vertices = 0;
    for (let featureIndex = 0; featureIndex < data.length; featureIndex++) {
        vertices += countVertices(data[featureIndex].coordinates);
    }
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

async function decompressAndParseBuffer(buffer, datasetName) {
    if (!buffer)
        throw new Error(`Fatal: Raw buffer for ${datasetName} is missing or empty.`);
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
        return await new Response(stream).json();
    }
    return JSON.parse(new TextDecoder().decode(buffer));
}

export async function decompressAndParseDatasets() {
    const [routes, rivers, peaks, parks, buildings, transit] = await Promise.all([
        decompressAndParseBuffer(rawBuffers.routes, "routes"),
        decompressAndParseBuffer(rawBuffers.rivers, "rivers"),
        decompressAndParseBuffer(rawBuffers.peaks, "peaks"),
        decompressAndParseBuffer(rawBuffers.parks, "parks"),
        decompressAndParseBuffer(rawBuffers.buildings, "buildings"),
        decompressAndParseBuffer(rawBuffers.transit, "transit")
    ]);
    assertValidDataset(routes, "routes");
    assertValidDataset(rivers, "rivers");
    assertValidDataset(peaks, "peaks");
    assertValidDataset(parks, "parks");
    assertValidDataset(buildings, "buildings");
    assertValidDataset(transit, "transit");

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
    buildingsData = null;
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
    assertValidDataset(routesData, "routes");
    const renderer = getSharedRenderer();
    const optionsByClass = Object.freeze({
        highway: Object.freeze({ renderer, color: ROAD_STYLES.highway.color, weight: ROAD_STYLES.highway.weight, opacity: ROAD_STYLES.highway.opacity, interactive: false, smoothFactor: 2.0 }),
        arterial: Object.freeze({ renderer, color: ROAD_STYLES.arterial.color, weight: ROAD_STYLES.arterial.weight, opacity: ROAD_STYLES.arterial.opacity, interactive: false, smoothFactor: 2.0 }),
        collector: Object.freeze({ renderer, color: ROAD_STYLES.collector.color, weight: ROAD_STYLES.collector.weight, opacity: ROAD_STYLES.collector.opacity, interactive: false, smoothFactor: 2.0 }),
        residential: Object.freeze({ renderer, color: ROAD_STYLES.residential.color, weight: ROAD_STYLES.residential.weight, opacity: ROAD_STYLES.residential.opacity, interactive: false, smoothFactor: 2.0 }),
        alley: Object.freeze({ renderer, color: ROAD_STYLES.alley.color, weight: ROAD_STYLES.alley.weight, opacity: ROAD_STYLES.alley.opacity, interactive: false, smoothFactor: 2.0 }),
        default: Object.freeze({ renderer, color: ROAD_STYLES.default.color, weight: ROAD_STYLES.default.weight, opacity: ROAD_STYLES.default.opacity, interactive: false, smoothFactor: 2.0 })
    });
    const coordinatesByRoadClass = {
        highway: [],
        arterial: [],
        collector: [],
        residential: [],
        alley: [],
        default: []
    };
    for (let routeIndex = 0; routeIndex < routesData.length; routeIndex++) {
        const route = routesData[routeIndex];
        const roadClass = Object.prototype.hasOwnProperty.call(coordinatesByRoadClass, route.class) ? route.class : "default";
        coordinatesByRoadClass[roadClass].push(route.coordinates);
    }
    const layers = [];
    for (const [roadClass, coords] of Object.entries(coordinatesByRoadClass)) {
        if (coords.length > 0) {
            layers.push(L.polyline(coords, optionsByClass[roadClass]));
        }
    }
    return L.layerGroup(layers);
}

export function createRiverLayerGroup() {
    assertValidDataset(riversData, "rivers");
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
    const batchBuilder = new VectorLayerBatchBuilder(riversData);
    return L.layerGroup(batchBuilder.buildLayers(polygonOptions, polylineOptions));
}

export function createPeakLayerGroup() {
    assertValidDataset(peaksData, "peaks");
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
    const layers = [];
    for (let peakIndex = 0; peakIndex < peaksData.length; peakIndex++) {
        const peak = peaksData[peakIndex];
        const marker = L.circleMarker(peak.coordinates, markerOptions);
        marker.bindTooltip(`${peak.name} (${peak.elevation}m)`, tooltipOptions);
        layers.push(marker);
    }
    return L.layerGroup(layers);
}

export function createParkLayerGroup() {
    assertValidDataset(parksData, "parks");
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
    const batchBuilder = new VectorLayerBatchBuilder(parksData);
    return L.layerGroup(batchBuilder.buildLayers(options));
}

export function createBuildingLayerGroup() {
    assertValidDataset(buildingsData, "buildings");
    const renderer = getSharedRenderer();
    const normalBuckets = Array.from({ length: 20 }, (unusedItem, opacityBucketIndex) => Object.freeze({
        renderer,
        color: THEME_COLORS.border,
        fillColor: THEME_COLORS.building,
        fillOpacity: Math.round((0.20 + (opacityBucketIndex / 19) * 0.75) * 100) / 100,
        weight: 1,
        interactive: false,
        smoothFactor: 2.0
    }));
    const tallBuckets = Array.from({ length: 20 }, (unusedItem, opacityBucketIndex) => Object.freeze({
        renderer,
        color: THEME_COLORS.border,
        fillColor: THEME_COLORS.buildingTall,
        fillOpacity: Math.round((0.20 + (opacityBucketIndex / 19) * 0.75) * 100) / 100,
        weight: 1,
        interactive: false,
        smoothFactor: 2.0
    }));

    const normalPolys = Array.from({ length: 20 }, () => ({ polygons: [], polylines: [] }));
    const tallPolys = Array.from({ length: 20 }, () => ({ polygons: [], polylines: [] }));

    for (let buildingIndex = 0; buildingIndex < buildingsData.length; buildingIndex++) {
        const building = buildingsData[buildingIndex];
        if (building.hgt_median_m === undefined || building.hgt_median_m === null || building.hgt_median_m === "") {
            throw new Error("Fatal: Building is missing hgt_median_m attribute.");
        }
        const height = Number(building.hgt_median_m);
        if (isNaN(height)) {
            throw new Error("Fatal: Building hgt_median_m attribute is not a valid number.");
        }
        const targetBucketIndex = Math.min(19, Math.max(0, Math.floor(((height - 10) / 190) * 20)));
        const target = height > 60 ? tallPolys[targetBucketIndex] : normalPolys[targetBucketIndex];
        if (building.type === "polygon") {
            target.polygons.push(building.coordinates);
        } else {
            target.polylines.push(building.coordinates);
        }
    }

    const layers = [];
    for (let opacityBucketIndex = 0; opacityBucketIndex < 20; opacityBucketIndex++) {
        if (normalPolys[opacityBucketIndex].polygons.length > 0)
            layers.push(L.polygon(normalPolys[opacityBucketIndex].polygons, normalBuckets[opacityBucketIndex]));
        if (normalPolys[opacityBucketIndex].polylines.length > 0)
            layers.push(L.polyline(normalPolys[opacityBucketIndex].polylines, normalBuckets[opacityBucketIndex]));
        if (tallPolys[opacityBucketIndex].polygons.length > 0)
            layers.push(L.polygon(tallPolys[opacityBucketIndex].polygons, tallBuckets[opacityBucketIndex]));
        if (tallPolys[opacityBucketIndex].polylines.length > 0)
            layers.push(L.polyline(tallPolys[opacityBucketIndex].polylines, tallBuckets[opacityBucketIndex]));
    }

    return L.layerGroup(layers);
}

export function createTransitLayerGroup() {
    assertValidDataset(transitData, "transit");
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
    const batchBuilder = new VectorLayerBatchBuilder(transitData);
    return L.layerGroup(batchBuilder.buildLayers(options));
}
