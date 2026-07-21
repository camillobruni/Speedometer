<script>
    import { mapStore } from "../stores/mapStore.js";
    import { benchmarkDriver } from "../services/benchmarkDriver.js";
    import {
        routesStats,
        riversStats,
        peaksStats,
        parksStats,
        buildingsStats,
        transitStats
    } from "../services/dataLoader.js";
</script>

<aside class="sidebar">
    <div class="panel-header">
        <h1 class="panel-title">SF TIGER/Line GIS Benchmark</h1>
        <p class="panel-subtitle">Svelte + Leaflet Canvas Workload (U.S. Census CC0)</p>
    </div>

    <div class="section-card">
        <h2 class="section-title">Lifecycle & Initialization</h2>
        <button
            id="btn-init-map"
            class="control-btn"
            on:click={() => benchmarkDriver.initializeMap()}
        >
            <span>Initialize Map</span>
            <span class="status-indicator" class:status-active={$mapStore.initialized}>
                {$mapStore.initialized ? "READY" : "OFF"}
            </span>
        </button>
        <button
            id="btn-teardown"
            class="control-btn"
            on:click={() => benchmarkDriver.teardown()}
        >
            <span>Teardown & Clean</span>
            <span class="status-indicator">RESET</span>
        </button>
    </div>

    <div class="section-card">
        <h2 class="section-title">TIGER/Line Vector Overlays (CC0)</h2>
        <button
            id="btn-toggle-parks"
            class="control-btn"
            disabled={!$mapStore.initialized}
            on:click={() => benchmarkDriver.toggleParks()}
        >
            <span class="btn-label-row">
                <span class="badge badge-park"></span>
                <span>Parks & Green Spaces ({parksStats.features} feats | {parksStats.vertices} verts)</span>
            </span>
            <span class="status-indicator" class:status-active={$mapStore.parksVisible}>
                {$mapStore.parksVisible ? "ON" : "OFF"}
            </span>
        </button>

        <button
            id="btn-toggle-rivers"
            class="control-btn"
            disabled={!$mapStore.initialized}
            on:click={() => benchmarkDriver.toggleRivers()}
        >
            <span class="btn-label-row">
                <span class="badge badge-river"></span>
                <span>Coastal Hydrography ({riversStats.features} feats | {riversStats.vertices} verts)</span>
            </span>
            <span class="status-indicator" class:status-active={$mapStore.riversVisible}>
                {$mapStore.riversVisible ? "ON" : "OFF"}
            </span>
        </button>

        <button
            id="btn-toggle-buildings"
            class="control-btn"
            disabled={!$mapStore.initialized}
            on:click={() => benchmarkDriver.toggleBuildings()}
        >
            <span class="btn-label-row">
                <span class="badge badge-building"></span>
                <span>Downtown Buildings ({buildingsStats.features} feats | {buildingsStats.vertices} verts)</span>
            </span>
            <span class="status-indicator" class:status-active={$mapStore.buildingsVisible}>
                {$mapStore.buildingsVisible ? "ON" : "OFF"}
            </span>
        </button>

        <button
            id="btn-toggle-routes"
            class="control-btn"
            disabled={!$mapStore.initialized}
            on:click={() => benchmarkDriver.toggleRoutes()}
        >
            <span class="btn-label-row">
                <span class="badge badge-route"></span>
                <span>SF Road Networks ({routesStats.features} feats | {routesStats.vertices} verts)</span>
            </span>
            <span class="status-indicator" class:status-active={$mapStore.routesVisible}>
                {$mapStore.routesVisible ? "ON" : "OFF"}
            </span>
        </button>

        <button
            id="btn-toggle-transit"
            class="control-btn"
            disabled={!$mapStore.initialized}
            on:click={() => benchmarkDriver.toggleTransit()}
        >
            <span class="btn-label-row">
                <span class="badge badge-transit"></span>
                <span>Muni Transit ({transitStats.features} feats | {transitStats.vertices} verts)</span>
            </span>
            <span class="status-indicator" class:status-active={$mapStore.transitVisible}>
                {$mapStore.transitVisible ? "ON" : "OFF"}
            </span>
        </button>

        <button
            id="btn-toggle-peaks"
            class="control-btn"
            disabled={!$mapStore.initialized}
            on:click={() => benchmarkDriver.togglePeaks()}
        >
            <span class="btn-label-row">
                <span class="badge badge-peak"></span>
                <span>SF Landmarks & Peaks ({peaksStats.features} feats | {peaksStats.vertices} verts)</span>
            </span>
            <span class="status-indicator" class:status-active={$mapStore.peaksVisible}>
                {$mapStore.peaksVisible ? "ON" : "OFF"}
            </span>
        </button>
    </div>

    <div class="section-card">
        <h2 class="section-title">Interactive Navigation</h2>
        <button
            id="btn-pan-zoom"
            class="control-btn"
            disabled={!$mapStore.initialized}
            on:click={() => benchmarkDriver.nextPanZoomIncrement()}
        >
            <span>Pan / Zoom Step</span>
            <span class="status-indicator">Step {$mapStore.panZoomStep}</span>
        </button>
    </div>
</aside>
