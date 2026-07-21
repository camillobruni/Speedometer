import L from "leaflet";
import { topographicTileLayer } from "../map/TopographicTileLayer.js";
import {
    createRouteLayerGroup,
    createRiverLayerGroup,
    createPeakLayerGroup,
    createParkLayerGroup,
    createBuildingLayerGroup,
    createTransitLayerGroup
} from "./dataLoader.js";
import { mapStore } from "../stores/mapStore.js";

class BenchmarkDriver {
    constructor() {
        this.mapContainer = null;
        this.map = null;
        this.topographicLayer = null;
        this.routeGroup = null;
        this.riverGroup = null;
        this.peakGroup = null;
        this.parkGroup = null;
        this.buildingGroup = null;
        this.transitGroup = null;
        this.currentPanZoomIndex = 0;
    }

    setContainer(element) {
        this.mapContainer = element;
    }

    initializeMap() {
        if (!this.mapContainer) {
            console.error("Map container not registered with BenchmarkDriver.");
            return;
        }
        if (this.map)
            this.teardown();

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
        mapStore.update(s => ({ ...s, initialized: true, panZoomStep: 0, activeStep: 0 }));
    }

    initTerrain() {
        this.initializeMap();
        if (!this.map)
            return;

        if (!this.parkGroup)
            this.parkGroup = createParkLayerGroup();

        if (!this.map.hasLayer(this.parkGroup))
            this.parkGroup.addTo(this.map);

        if (!this.riverGroup)
            this.riverGroup = createRiverLayerGroup();

        if (!this.map.hasLayer(this.riverGroup))
            this.riverGroup.addTo(this.map);

        mapStore.update(s => ({
            ...s,
            initialized: true,
            parksVisible: true,
            riversVisible: true,
            panZoomStep: 1,
            activeStep: 1
        }));
    }

    addRoadsTransit() {
        if (!this.map)
            return;

        if (!this.routeGroup)
            this.routeGroup = createRouteLayerGroup();

        if (!this.map.hasLayer(this.routeGroup))
            this.routeGroup.addTo(this.map);

        if (!this.transitGroup)
            this.transitGroup = createTransitLayerGroup();

        if (!this.map.hasLayer(this.transitGroup))
            this.transitGroup.addTo(this.map);

        mapStore.update(s => ({
            ...s,
            routesVisible: true,
            transitVisible: true,
            panZoomStep: 2,
            activeStep: 2
        }));
    }

    addBuildingsLandmarks() {
        if (!this.map)
            return;

        if (!this.buildingGroup)
            this.buildingGroup = createBuildingLayerGroup();

        if (!this.map.hasLayer(this.buildingGroup))
            this.buildingGroup.addTo(this.map);

        if (!this.peakGroup)
            this.peakGroup = createPeakLayerGroup();

        if (!this.map.hasLayer(this.peakGroup))
            this.peakGroup.addTo(this.map);

        mapStore.update(s => ({
            ...s,
            buildingsVisible: true,
            peaksVisible: true,
            panZoomStep: 3,
            activeStep: 3
        }));
    }

    navGoldenGatePark() {
        if (!this.map)
            return;
        this.map.setView([37.7694, -122.4862], 14, { animate: false });
        this.currentPanZoomIndex = 1;
        mapStore.update(s => ({ ...s, panZoomStep: 4, activeStep: 4 }));
    }

    navDowntown() {
        if (!this.map)
            return;
        this.map.setView([37.7915, -122.3990], 17, { animate: false });
        this.currentPanZoomIndex = 2;
        mapStore.update(s => ({ ...s, panZoomStep: 5, activeStep: 5 }));
    }

    navMuni() {
        if (!this.map)
            return;
        this.map.setView([37.7550, -122.4400], 12, { animate: false });
        this.currentPanZoomIndex = 3;
        mapStore.update(s => ({ ...s, panZoomStep: 6, activeStep: 6 }));
    }

    navTwinPeaks() {
        if (!this.map)
            return;
        this.map.setView([37.7525, -122.4474], 15, { animate: false });
        this.currentPanZoomIndex = 4;
        mapStore.update(s => ({ ...s, panZoomStep: 7, activeStep: 7 }));
    }

    addOverlays() {
        if (!this.map)
            return;

        if (!this.parkGroup)
            this.parkGroup = createParkLayerGroup();

        if (!this.map.hasLayer(this.parkGroup))
            this.parkGroup.addTo(this.map);

        if (!this.riverGroup)
            this.riverGroup = createRiverLayerGroup();

        if (!this.map.hasLayer(this.riverGroup))
            this.riverGroup.addTo(this.map);

        if (!this.buildingGroup)
            this.buildingGroup = createBuildingLayerGroup();

        if (!this.map.hasLayer(this.buildingGroup))
            this.buildingGroup.addTo(this.map);

        if (!this.routeGroup)
            this.routeGroup = createRouteLayerGroup();

        if (!this.map.hasLayer(this.routeGroup))
            this.routeGroup.addTo(this.map);

        if (!this.transitGroup)
            this.transitGroup = createTransitLayerGroup();

        if (!this.map.hasLayer(this.transitGroup))
            this.transitGroup.addTo(this.map);

        if (!this.peakGroup)
            this.peakGroup = createPeakLayerGroup();

        if (!this.map.hasLayer(this.peakGroup))
            this.peakGroup.addTo(this.map);

        mapStore.update(s => ({
            ...s,
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
            return;
        if (!this.parkGroup)
            this.parkGroup = createParkLayerGroup();
        if (this.map.hasLayer(this.parkGroup)) {
            this.map.removeLayer(this.parkGroup);
            mapStore.update(s => ({ ...s, parksVisible: false }));
        } else {
            this.parkGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, parksVisible: true }));
        }
    }

    toggleRivers() {
        if (!this.map)
            return;
        if (!this.riverGroup)
            this.riverGroup = createRiverLayerGroup();
        if (this.map.hasLayer(this.riverGroup)) {
            this.map.removeLayer(this.riverGroup);
            mapStore.update(s => ({ ...s, riversVisible: false }));
        } else {
            this.riverGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, riversVisible: true }));
        }
    }

    toggleBuildings() {
        if (!this.map)
            return;
        if (!this.buildingGroup)
            this.buildingGroup = createBuildingLayerGroup();
        if (this.map.hasLayer(this.buildingGroup)) {
            this.map.removeLayer(this.buildingGroup);
            mapStore.update(s => ({ ...s, buildingsVisible: false }));
        } else {
            this.buildingGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, buildingsVisible: true }));
        }
    }

    toggleRoutes() {
        if (!this.map)
            return;
        if (!this.routeGroup)
            this.routeGroup = createRouteLayerGroup();
        if (this.map.hasLayer(this.routeGroup)) {
            this.map.removeLayer(this.routeGroup);
            mapStore.update(s => ({ ...s, routesVisible: false }));
        } else {
            this.routeGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, routesVisible: true }));
        }
    }

    toggleTransit() {
        if (!this.map)
            return;
        if (!this.transitGroup)
            this.transitGroup = createTransitLayerGroup();
        if (this.map.hasLayer(this.transitGroup)) {
            this.map.removeLayer(this.transitGroup);
            mapStore.update(s => ({ ...s, transitVisible: false }));
        } else {
            this.transitGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, transitVisible: true }));
        }
    }

    togglePeaks() {
        if (!this.map)
            return;
        if (!this.peakGroup)
            this.peakGroup = createPeakLayerGroup();
        if (this.map.hasLayer(this.peakGroup)) {
            this.map.removeLayer(this.peakGroup);
            mapStore.update(s => ({ ...s, peaksVisible: false }));
        } else {
            this.peakGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, peaksVisible: true }));
        }
    }

    nextPanZoomIncrement() {
        if (!this.map)
            return;
        const step = this.currentPanZoomIndex % 4;
        switch (step) {
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
        this.currentPanZoomIndex = (step + 1) % 4;
    }

    teardown() {
        if (this.map) {
            if (this.routeGroup && this.map.hasLayer(this.routeGroup))
                this.map.removeLayer(this.routeGroup);

            if (this.riverGroup && this.map.hasLayer(this.riverGroup))
                this.map.removeLayer(this.riverGroup);

            if (this.peakGroup && this.map.hasLayer(this.peakGroup))
                this.map.removeLayer(this.peakGroup);

            if (this.parkGroup && this.map.hasLayer(this.parkGroup))
                this.map.removeLayer(this.parkGroup);

            if (this.buildingGroup && this.map.hasLayer(this.buildingGroup))
                this.map.removeLayer(this.buildingGroup);

            if (this.transitGroup && this.map.hasLayer(this.transitGroup))
                this.map.removeLayer(this.transitGroup);

            this.map.remove();
            this.map = null;
        }
        this.topographicLayer = null;
        this.routeGroup = null;
        this.riverGroup = null;
        this.peakGroup = null;
        this.parkGroup = null;
        this.buildingGroup = null;
        this.transitGroup = null;
        this.currentPanZoomIndex = 0;
        mapStore.set({
            initialized: false,
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
}

export const benchmarkDriver = new BenchmarkDriver();

if (typeof window !== "undefined") {
    window.workload = benchmarkDriver;
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
}
