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
