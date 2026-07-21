import { writable } from "svelte/store";

export const mapStore = writable({
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

export const layerStats = writable({
    routes: { features: 0, vertices: 0 },
    rivers: { features: 0, vertices: 0 },
    peaks: { features: 0, vertices: 0 },
    parks: { features: 0, vertices: 0 },
    buildings: { features: 0, vertices: 0 },
    transit: { features: 0, vertices: 0 }
});
