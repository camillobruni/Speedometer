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
        if (this.map) {
            this.teardown();
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
        mapStore.update(s => ({ ...s, initialized: true, panZoomStep: 0 }));
    }

    addOverlays() {
        if (!this.map) return;

        if (!this.parkGroup) {
            this.parkGroup = createParkLayerGroup();
        }
        if (!this.map.hasLayer(this.parkGroup)) {
            this.parkGroup.addTo(this.map);
        }

        if (!this.riverGroup) {
            this.riverGroup = createRiverLayerGroup();
        }
        if (!this.map.hasLayer(this.riverGroup)) {
            this.riverGroup.addTo(this.map);
        }

        if (!this.buildingGroup) {
            this.buildingGroup = createBuildingLayerGroup();
        }
        if (!this.map.hasLayer(this.buildingGroup)) {
            this.buildingGroup.addTo(this.map);
        }

        if (!this.routeGroup) {
            this.routeGroup = createRouteLayerGroup();
        }
        if (!this.map.hasLayer(this.routeGroup)) {
            this.routeGroup.addTo(this.map);
        }

        if (!this.transitGroup) {
            this.transitGroup = createTransitLayerGroup();
        }
        if (!this.map.hasLayer(this.transitGroup)) {
            this.transitGroup.addTo(this.map);
        }

        if (!this.peakGroup) {
            this.peakGroup = createPeakLayerGroup();
        }
        if (!this.map.hasLayer(this.peakGroup)) {
            this.peakGroup.addTo(this.map);
        }

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
        if (!this.map) return;
        if (!this.parkGroup) this.parkGroup = createParkLayerGroup();
        if (this.map.hasLayer(this.parkGroup)) {
            this.map.removeLayer(this.parkGroup);
            mapStore.update(s => ({ ...s, parksVisible: false }));
        } else {
            this.parkGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, parksVisible: true }));
        }
    }

    toggleRivers() {
        if (!this.map) return;
        if (!this.riverGroup) this.riverGroup = createRiverLayerGroup();
        if (this.map.hasLayer(this.riverGroup)) {
            this.map.removeLayer(this.riverGroup);
            mapStore.update(s => ({ ...s, riversVisible: false }));
        } else {
            this.riverGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, riversVisible: true }));
        }
    }

    toggleBuildings() {
        if (!this.map) return;
        if (!this.buildingGroup) this.buildingGroup = createBuildingLayerGroup();
        if (this.map.hasLayer(this.buildingGroup)) {
            this.map.removeLayer(this.buildingGroup);
            mapStore.update(s => ({ ...s, buildingsVisible: false }));
        } else {
            this.buildingGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, buildingsVisible: true }));
        }
    }

    toggleRoutes() {
        if (!this.map) return;
        if (!this.routeGroup) this.routeGroup = createRouteLayerGroup();
        if (this.map.hasLayer(this.routeGroup)) {
            this.map.removeLayer(this.routeGroup);
            mapStore.update(s => ({ ...s, routesVisible: false }));
        } else {
            this.routeGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, routesVisible: true }));
        }
    }

    toggleTransit() {
        if (!this.map) return;
        if (!this.transitGroup) this.transitGroup = createTransitLayerGroup();
        if (this.map.hasLayer(this.transitGroup)) {
            this.map.removeLayer(this.transitGroup);
            mapStore.update(s => ({ ...s, transitVisible: false }));
        } else {
            this.transitGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, transitVisible: true }));
        }
    }

    togglePeaks() {
        if (!this.map) return;
        if (!this.peakGroup) this.peakGroup = createPeakLayerGroup();
        if (this.map.hasLayer(this.peakGroup)) {
            this.map.removeLayer(this.peakGroup);
            mapStore.update(s => ({ ...s, peaksVisible: false }));
        } else {
            this.peakGroup.addTo(this.map);
            mapStore.update(s => ({ ...s, peaksVisible: true }));
        }
    }

    nextPanZoomIncrement() {
        if (!this.map) return;
        const step = this.currentPanZoomIndex % 5;
        switch (step) {
            case 0:
                this.map.setView([37.7941, -122.3952], 14, { animate: false });
                break;
            case 1:
                this.map.panBy([-300, -200], { animate: false });
                break;
            case 2:
                this.map.setZoom(15, { animate: false });
                break;
            case 3:
                this.map.panBy([150, 350], { animate: false });
                break;
            case 4:
                this.map.setView([37.7749, -122.4194], 13, { animate: false });
                break;
        }
        this.currentPanZoomIndex++;
        mapStore.update(s => ({ ...s, panZoomStep: this.currentPanZoomIndex }));
    }

    teardown() {
        if (this.map) {
            if (this.routeGroup && this.map.hasLayer(this.routeGroup)) {
                this.map.removeLayer(this.routeGroup);
            }
            if (this.riverGroup && this.map.hasLayer(this.riverGroup)) {
                this.map.removeLayer(this.riverGroup);
            }
            if (this.peakGroup && this.map.hasLayer(this.peakGroup)) {
                this.map.removeLayer(this.peakGroup);
            }
            if (this.parkGroup && this.map.hasLayer(this.parkGroup)) {
                this.map.removeLayer(this.parkGroup);
            }
            if (this.buildingGroup && this.map.hasLayer(this.buildingGroup)) {
                this.map.removeLayer(this.buildingGroup);
            }
            if (this.transitGroup && this.map.hasLayer(this.transitGroup)) {
                this.map.removeLayer(this.transitGroup);
            }
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
            panZoomStep: 0
        });
    }

    flushAsync() {
        if (typeof window.__speedometer_flush_raf === "function") {
            window.__speedometer_flush_raf();
        }
    }
}

export const benchmarkDriver = new BenchmarkDriver();

if (typeof window !== "undefined") {
    window.workload = benchmarkDriver;
    window.benchmarkInitializeMap = () => benchmarkDriver.initializeMap();
    window.benchmarkAddOverlays = () => benchmarkDriver.addOverlays();
    window.benchmarkNextPanZoomIncrement = () => benchmarkDriver.nextPanZoomIncrement();
    window.benchmarkTeardown = () => benchmarkDriver.teardown();
    window.benchmarkFlushAsync = () => benchmarkDriver.flushAsync();
}
