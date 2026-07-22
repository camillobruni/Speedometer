import L from "leaflet";
import { topographicTileLayer } from "../map/TopographicTileLayer.js";
import {
    createRouteLayerGroup,
    createRiverLayerGroup,
    createPeakLayerGroup,
    createParkLayerGroup,
    createBuildingLayerGroup,
    createTransitLayerGroup,
    decompressAndParseDatasets,
    resetParsedDatasets,
    resetSharedRenderer
} from "./dataLoader.js";
import { mapStore } from "../stores/mapStore.js";

export class CanvasRasterizationVerifier {
    static verify(canvases, assertNonEmpty = true) {
        if (!canvases || canvases.length === 0) {
            throw new Error("Fatal: No canvases found during rasterization verification.");
        }

        let checksum = 0;
        let hasNonZeroAlpha = false;

        for (let canvasIndex = 0; canvasIndex < canvases.length; canvasIndex++) {
            const canvas = canvases[canvasIndex];
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            if (canvasWidth <= 0 || canvasHeight <= 0) {
                throw new Error("Fatal: Canvas has invalid dimensions during verification.");
            }
            const renderingContext = canvas.getContext("2d");
            if (!renderingContext) {
                throw new Error("Fatal: Canvas missing 2d context during verification.");
            }

            const sampleBoxes = [
                [0, 0],
                [Math.max(0, canvasWidth - 4), 0],
                [0, Math.max(0, canvasHeight - 4)],
                [Math.max(0, canvasWidth - 4), Math.max(0, canvasHeight - 4)],
                [Math.floor(Math.max(0, canvasWidth - 4) / 2), Math.floor(Math.max(0, canvasHeight - 4) / 2)]
            ];
            for (let boxIndex = 0; boxIndex < sampleBoxes.length; boxIndex++) {
                const [sampleX, sampleY] = sampleBoxes[boxIndex];
                const sampleWidth = Math.min(4, canvasWidth - sampleX);
                const sampleHeight = Math.min(4, canvasHeight - sampleY);
                if (sampleWidth <= 0 || sampleHeight <= 0) {
                    throw new Error("Fatal: Invalid sample box dimensions during verification.");
                }
                const imageData = renderingContext.getImageData(sampleX, sampleY, sampleWidth, sampleHeight);
                const data = imageData.data;
                for (let pixelIndex = 0; pixelIndex < data.length; pixelIndex += 4) {
                    const redChannel = data[pixelIndex];
                    const greenChannel = data[pixelIndex + 1];
                    const blueChannel = data[pixelIndex + 2];
                    const alphaChannel = data[pixelIndex + 3];
                    if (alphaChannel > 0) {
                        hasNonZeroAlpha = true;
                    }
                    checksum = ((checksum << 5) - checksum + redChannel + (greenChannel << 1) + blueChannel + (alphaChannel << 2)) | 0;
                }
            }
        }

        if (assertNonEmpty && !hasNonZeroAlpha) {
            throw new Error("Fatal: Canvas rasterization verification failed: all sampled pixels evaluate to zero alpha (empty render).");
        }

        return checksum;
    }
}

export class LayerGroupManager {
    constructor() {
        this.groups = {
            route: null,
            river: null,
            peak: null,
            park: null,
            building: null,
            transit: null
        };
        this.creators = {
            route: createRouteLayerGroup,
            river: createRiverLayerGroup,
            peak: createPeakLayerGroup,
            park: createParkLayerGroup,
            building: createBuildingLayerGroup,
            transit: createTransitLayerGroup
        };
        this.storeKeys = {
            route: "routesVisible",
            river: "riversVisible",
            peak: "peaksVisible",
            park: "parksVisible",
            building: "buildingsVisible",
            transit: "transitVisible"
        };
        this.orderedKeys = ["route", "river", "peak", "park", "building", "transit"];
    }

    reset() {
        for (let index = 0; index < this.orderedKeys.length; index++) {
            const key = this.orderedKeys[index];
            this.groups[key] = null;
        }
    }

    removeAll(map) {
        if (map) {
            for (let index = 0; index < this.orderedKeys.length; index++) {
                const key = this.orderedKeys[index];
                const layerGroup = this.groups[key];
                if (layerGroup && map.hasLayer(layerGroup)) {
                    map.removeLayer(layerGroup);
                }
            }
        }
        this.reset();
    }

    ensure(layerName, map) {
        if (!this.groups[layerName]) {
            this.groups[layerName] = this.creators[layerName]();
        }
        const layerGroup = this.groups[layerName];
        if (!map.hasLayer(layerGroup)) {
            layerGroup.addTo(map);
        }
        return layerGroup;
    }

    remove(layerName, map) {
        const layerGroup = this.groups[layerName];
        if (layerGroup && map.hasLayer(layerGroup)) {
            map.removeLayer(layerGroup);
        }
    }

    toggle(layerName, map) {
        if (!this.groups[layerName]) {
            this.groups[layerName] = this.creators[layerName]();
        }
        const layerGroup = this.groups[layerName];
        const storeKey = this.storeKeys[layerName];
        if (map.hasLayer(layerGroup)) {
            map.removeLayer(layerGroup);
            mapStore.update(currentMapState => ({ ...currentMapState, [storeKey]: false }));
        } else {
            layerGroup.addTo(map);
            mapStore.update(currentMapState => ({ ...currentMapState, [storeKey]: true }));
        }
    }
}

class BenchmarkDriver {
    constructor() {
        this.mapContainer = null;
        this.map = null;
        this.topographicLayer = null;
        this.layerManager = new LayerGroupManager();
        this.currentPanZoomIndex = 0;
    }

    get routeGroup() { return this.layerManager.groups.route; }
    get riverGroup() { return this.layerManager.groups.river; }
    get peakGroup() { return this.layerManager.groups.peak; }
    get parkGroup() { return this.layerManager.groups.park; }
    get buildingGroup() { return this.layerManager.groups.building; }
    get transitGroup() { return this.layerManager.groups.transit; }

    setContainer(element) {
        this.mapContainer = element;
    }

    async decompressAndParse() {
        this.layerManager.reset();

        await decompressAndParseDatasets();
        mapStore.update(currentMapState => ({ ...currentMapState, decompressed: true }));
        if (typeof window !== "undefined")
            window.dispatchEvent(new CustomEvent("dataset-decompress-complete"));
    }

    initializeMap() {
        if (!this.mapContainer) {
            throw new Error("Fatal: Map container not registered with BenchmarkDriver.");
        }
        if (this.map) {
            this.layerManager.removeAll(this.map);
            this.map.remove();
            this.map = null;
            resetSharedRenderer();
            this.topographicLayer = null;
        }

        this.map = L.map(this.mapContainer, {
            center: [37.7749, -122.4194],
            zoom: 13,
            preferCanvas: true,
            animate: false,
            fadeAnimation: false,
            zoomAnimation: false,
            markerZoomAnimation: false,
            inertia: false,
            attributionControl: false,
            zoomControl: true
        });

        this.topographicLayer = topographicTileLayer({
            minZoom: 3,
            maxZoom: 18,
            keepBuffer: 2,
            noWrap: true
        }).addTo(this.map);

        this.currentPanZoomIndex = 0;
        mapStore.update(currentMapState => ({ ...currentMapState, initialized: true, panZoomStep: 0, activeStep: 0 }));
    }

    initTerrain() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during initTerrain.");

        this.layerManager.ensure("park", this.map);
        this.layerManager.ensure("river", this.map);

        mapStore.update(currentMapState => ({
            ...currentMapState,
            initialized: true,
            parksVisible: true,
            riversVisible: true,
            panZoomStep: 1,
            activeStep: 1
        }));
    }

    addRoadsTransit() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during addRoadsTransit.");

        this.layerManager.ensure("route", this.map);
        this.layerManager.ensure("transit", this.map);

        mapStore.update(currentMapState => ({
            ...currentMapState,
            routesVisible: true,
            transitVisible: true,
            panZoomStep: 2,
            activeStep: 2
        }));
    }

    addBuildingsLandmarks() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during addBuildingsLandmarks.");

        this.layerManager.ensure("building", this.map);
        this.layerManager.ensure("peak", this.map);

        mapStore.update(currentMapState => ({
            ...currentMapState,
            buildingsVisible: true,
            peaksVisible: true,
            panZoomStep: 3,
            activeStep: 3
        }));
    }

    navGoldenGatePark() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during navGoldenGatePark.");
        this.map.setView([37.7694, -122.4862], 14, { animate: false });
        this.currentPanZoomIndex = 1;
        mapStore.update(currentMapState => ({ ...currentMapState, panZoomStep: 4, activeStep: 4 }));
    }

    navDowntown() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during navDowntown.");
        this.map.setView([37.7915, -122.3990], 16.5, { animate: false });
        this.currentPanZoomIndex = 2;
        mapStore.update(currentMapState => ({ ...currentMapState, panZoomStep: 5, activeStep: 5 }));
    }

    navMuni() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during navMuni.");
        this.layerManager.remove("building", this.map);
        this.map.setView([37.7675, -122.4280], 13.5, { animate: false });
        this.currentPanZoomIndex = 3;
        mapStore.update(currentMapState => ({ ...currentMapState, buildingsVisible: false, panZoomStep: 6, activeStep: 6 }));
    }

    navTwinPeaks() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during navTwinPeaks.");
        this.layerManager.ensure("building", this.map);
        this.map.setView([37.7525, -122.4475], 15, { animate: false });
        this.currentPanZoomIndex = 4;
        mapStore.update(currentMapState => ({ ...currentMapState, buildingsVisible: true, panZoomStep: 7, activeStep: 7 }));
    }

    addOverlays() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during addOverlays.");

        this.layerManager.ensure("park", this.map);
        this.layerManager.ensure("river", this.map);
        this.layerManager.ensure("building", this.map);
        this.layerManager.ensure("route", this.map);
        this.layerManager.ensure("transit", this.map);
        this.layerManager.ensure("peak", this.map);

        mapStore.update(currentMapState => ({
            ...currentMapState,
            parksVisible: true,
            riversVisible: true,
            buildingsVisible: true,
            routesVisible: true,
            transitVisible: true,
            peaksVisible: true
        }));
    }

    toggleParks() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during toggleParks.");
        this.layerManager.toggle("park", this.map);
    }

    toggleRivers() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during toggleRivers.");
        this.layerManager.toggle("river", this.map);
    }

    toggleBuildings() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during toggleBuildings.");
        this.layerManager.toggle("building", this.map);
    }

    toggleRoutes() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during toggleRoutes.");
        this.layerManager.toggle("route", this.map);
    }

    toggleTransit() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during toggleTransit.");
        this.layerManager.toggle("transit", this.map);
    }

    togglePeaks() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during togglePeaks.");
        this.layerManager.toggle("peak", this.map);
    }

    nextPanZoomIncrement() {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during nextPanZoomIncrement.");
        const navigationStepIndex = this.currentPanZoomIndex % 4;
        switch (navigationStepIndex) {
            case 0:
                this.navGoldenGatePark();
                break;
            case 1:
                this.navDowntown();
                break;
            case 2:
                this.navMuni();
                break;
            case 3:
                this.navTwinPeaks();
                break;
        }
        this.currentPanZoomIndex = (navigationStepIndex + 1) % 4;
    }

    teardown() {
        if (this.map) {
            this.layerManager.removeAll(this.map);
            this.map.remove();
            this.map = null;
        } else {
            this.layerManager.reset();
        }
        this.topographicLayer = null;
        this.currentPanZoomIndex = 0;
        resetParsedDatasets();
        mapStore.set({
            initialized: false,
            decompressed: false,
            routesVisible: false,
            riversVisible: false,
            peaksVisible: false,
            parksVisible: false,
            buildingsVisible: false,
            transitVisible: false,
            panZoomStep: 0,
            activeStep: 0
        });
    }

    flushAsync() {
        if (typeof window.__speedometer_flush_raf === "function")
            window.__speedometer_flush_raf();
    }

    forceCanvasRasterization(assertNonEmpty = true) {
        if (!this.map)
            throw new Error("Fatal: Map uninitialized during forceCanvasRasterization.");
        const overlayPane = this.map.getPane("overlayPane");
        const tilePane = this.map.getPane("tilePane");
        const overlayCanvases = overlayPane ? Array.from(overlayPane.querySelectorAll("canvas")) : [];
        const tileCanvases = tilePane ? Array.from(tilePane.querySelectorAll("canvas")) : [];
        const canvases = [...overlayCanvases, ...tileCanvases];

        const checksum = CanvasRasterizationVerifier.verify(canvases, assertNonEmpty);

        if (typeof window !== "undefined")
            window._lastCanvasChecksum = checksum;

        return checksum;
    }
}

export const benchmarkDriver = new BenchmarkDriver();

if (typeof window !== "undefined") {
    window.workload = benchmarkDriver;
    window.benchmarkDecompressAndParse = () => benchmarkDriver.decompressAndParse();
    window.benchmarkInitializeMap = () => benchmarkDriver.initializeMap();
    window.benchmarkInitTerrain = () => benchmarkDriver.initTerrain();
    window.benchmarkAddOverlays = () => benchmarkDriver.addOverlays();
    window.benchmarkAddRoadsTransit = () => benchmarkDriver.addRoadsTransit();
    window.benchmarkAddBuildingsLandmarks = () => benchmarkDriver.addBuildingsLandmarks();
    window.benchmarkNavGoldenGatePark = () => benchmarkDriver.navGoldenGatePark();
    window.benchmarkNavDowntown = () => benchmarkDriver.navDowntown();
    window.benchmarkNavMuni = () => benchmarkDriver.navMuni();
    window.benchmarkNavTwinPeaks = () => benchmarkDriver.navTwinPeaks();
    window.benchmarkNextPanZoomIncrement = () => benchmarkDriver.nextPanZoomIncrement();
    window.benchmarkTeardown = () => benchmarkDriver.teardown();
    window.benchmarkFlushAsync = () => benchmarkDriver.flushAsync();
    window.benchmarkForceRasterization = (assertNonEmpty) => benchmarkDriver.forceCanvasRasterization(assertNonEmpty);
}

