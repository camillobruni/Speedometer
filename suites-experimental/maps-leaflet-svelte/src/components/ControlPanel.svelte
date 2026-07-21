<script>
    import { mapStore, layerStats } from "../stores/mapStore.js";
    import { benchmarkDriver } from "../services/benchmarkDriver.js";

    function formatCount(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + "m";
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + "k";
        }
        return num.toString();
    }
</script>

<aside class="sidebar">
    <div class="panel-header">
        <h1 class="panel-title">Layers</h1>
        <p class="panel-subtitle">SF TIGER/Line GIS</p>
    </div>

    <div class="section-card">
        <h2 class="section-title">Lifecycle & Init</h2>
        <button
            id="btn-decompress-data"
            class="control-btn"
            disabled={$mapStore.decompressed}
            on:click={() => benchmarkDriver.decompressAndParse()}
        >
            <div class="btn-top-row">
                <span>Decompress Data</span>
                <span class="status-indicator" class:status-active={$mapStore.decompressed}>
                    {$mapStore.decompressed ? "READY" : "OFF"}
                </span>
            </div>
        </button>
        <button
            id="btn-init-map"
            class="control-btn"
            disabled={!$mapStore.decompressed}
            on:click={() => benchmarkDriver.initializeMap()}
        >
            <div class="btn-top-row">
                <span>Initialize Map</span>
                <span class="status-indicator" class:status-active={$mapStore.initialized}>
                    {!$mapStore.decompressed ? "WAIT" : $mapStore.initialized ? "READY" : "OFF"}
                </span>
            </div>
        </button>
        <button
            id="btn-teardown"
            class="control-btn"
            disabled={!($mapStore.initialized || $mapStore.decompressed)}
            on:click={() => benchmarkDriver.teardown()}
        >
            <div class="btn-top-row">
                <span>Teardown</span>
                <span class="status-indicator">{!($mapStore.initialized || $mapStore.decompressed) ? "OFF" : "RESET"}</span>
            </div>
        </button>
    </div>

    <div class="section-card">
        <h2 class="section-title">Vector Overlays (CC0)</h2>
        <button
            id="btn-toggle-parks"
            class="control-btn"
            disabled={!($mapStore.initialized && $mapStore.decompressed)}
            on:click={() => benchmarkDriver.toggleParks()}
        >
            <div class="btn-top-row">
                <span class="btn-label-group">
                    <span class="layer-icon" title="Parks & Green Spaces">
                        <svg viewBox="0 0 18 18" width="16" height="16" stroke="currentColor" fill="none" stroke-width="1.3">
                            <rect x="1.5" y="1.5" width="15" height="15" stroke-dasharray="2 2" rx="1" />
                            <circle cx="9" cy="8" r="3.5" />
                            <line x1="9" y1="11.5" x2="9" y2="15" stroke-width="1.5" />
                        </svg>
                    </span>
                    <span>Parks</span>
                </span>
                <span class="status-indicator" class:status-active={$mapStore.parksVisible}>
                    {$mapStore.parksVisible ? "ON" : "OFF"}
                </span>
            </div>
            <div class="btn-telemetry">
                {formatCount($layerStats.parks.features)} feats | {formatCount($layerStats.parks.vertices)} verts
            </div>
        </button>

        <button
            id="btn-toggle-rivers"
            class="control-btn"
            disabled={!($mapStore.initialized && $mapStore.decompressed)}
            on:click={() => benchmarkDriver.toggleRivers()}
        >
            <div class="btn-top-row">
                <span class="btn-label-group">
                    <span class="layer-icon" title="Coastal Hydrography">
                        <svg viewBox="0 0 18 18" width="16" height="16" stroke="currentColor" fill="none" stroke-width="1.4" stroke-linecap="round">
                            <path d="M2 5 C 6 2, 12 8, 16 5" />
                            <path d="M2 9 C 6 6, 12 12, 16 9" />
                            <path d="M2 13 C 6 10, 12 16, 16 13" />
                        </svg>
                    </span>
                    <span>Rivers</span>
                </span>
                <span class="status-indicator" class:status-active={$mapStore.riversVisible}>
                    {$mapStore.riversVisible ? "ON" : "OFF"}
                </span>
            </div>
            <div class="btn-telemetry">
                {formatCount($layerStats.rivers.features)} feats | {formatCount($layerStats.rivers.vertices)} verts
            </div>
        </button>

        <button
            id="btn-toggle-buildings"
            class="control-btn"
            disabled={!($mapStore.initialized && $mapStore.decompressed)}
            on:click={() => benchmarkDriver.toggleBuildings()}
        >
            <div class="btn-top-row">
                <span class="btn-label-group">
                    <span class="layer-icon" title="Downtown Buildings">
                        <svg viewBox="0 0 18 18" width="16" height="16" stroke="currentColor" fill="none" stroke-width="1.3">
                            <path d="M3 16 V 7 H 8 V 16" />
                            <path d="M8 16 V 3 H 15 V 16" />
                            <line x1="10" y1="6" x2="13" y2="6" stroke-width="1" />
                            <line x1="10" y1="9" x2="13" y2="9" stroke-width="1" />
                            <line x1="10" y1="12" x2="13" y2="12" stroke-width="1" />
                            <line x1="5" y1="10" x2="6" y2="10" stroke-width="1" />
                            <line x1="5" y1="13" x2="6" y2="13" stroke-width="1" />
                        </svg>
                    </span>
                    <span>Buildings</span>
                </span>
                <span class="status-indicator" class:status-active={$mapStore.buildingsVisible}>
                    {$mapStore.buildingsVisible ? "ON" : "OFF"}
                </span>
            </div>
            <div class="btn-telemetry">
                {formatCount($layerStats.buildings.features)} feats | {formatCount($layerStats.buildings.vertices)} verts
            </div>
        </button>

        <button
            id="btn-toggle-routes"
            class="control-btn"
            disabled={!($mapStore.initialized && $mapStore.decompressed)}
            on:click={() => benchmarkDriver.toggleRoutes()}
        >
            <div class="btn-top-row">
                <span class="btn-label-group">
                    <span class="layer-icon" title="SF Road Networks">
                        <svg viewBox="0 0 18 18" width="16" height="16" stroke="currentColor" fill="none" stroke-width="1.3">
                            <line x1="1" y1="6" x2="17" y2="6" />
                            <line x1="1" y1="12" x2="17" y2="12" />
                            <line x1="6" y1="1" x2="6" y2="17" />
                            <line x1="12" y1="1" x2="12" y2="17" />
                            <line x1="1" y1="9" x2="17" y2="9" stroke-width="1" stroke-dasharray="2 2" />
                            <line x1="9" y1="1" x2="9" y2="17" stroke-width="1" stroke-dasharray="2 2" />
                        </svg>
                    </span>
                    <span>Routes</span>
                </span>
                <span class="status-indicator" class:status-active={$mapStore.routesVisible}>
                    {$mapStore.routesVisible ? "ON" : "OFF"}
                </span>
            </div>
            <div class="btn-telemetry">
                {formatCount($layerStats.routes.features)} feats | {formatCount($layerStats.routes.vertices)} verts
            </div>
        </button>

        <button
            id="btn-toggle-transit"
            class="control-btn"
            disabled={!($mapStore.initialized && $mapStore.decompressed)}
            on:click={() => benchmarkDriver.toggleTransit()}
        >
            <div class="btn-top-row">
                <span class="btn-label-group">
                    <span class="layer-icon" title="Muni Transit">
                        <svg viewBox="0 0 18 18" width="16" height="16" stroke="currentColor" fill="none" stroke-width="1.4">
                            <line x1="6" y1="2" x2="6" y2="16" />
                            <line x1="12" y1="2" x2="12" y2="16" />
                            <line x1="4" y1="4" x2="14" y2="4" stroke-width="1.2" />
                            <line x1="4" y1="8" x2="14" y2="8" stroke-width="1.2" />
                            <line x1="4" y1="12" x2="14" y2="12" stroke-width="1.2" />
                            <line x1="4" y1="16" x2="14" y2="16" stroke-width="1.2" />
                        </svg>
                    </span>
                    <span>Transit</span>
                </span>
                <span class="status-indicator" class:status-active={$mapStore.transitVisible}>
                    {$mapStore.transitVisible ? "ON" : "OFF"}
                </span>
            </div>
            <div class="btn-telemetry">
                {formatCount($layerStats.transit.features)} feats | {formatCount($layerStats.transit.vertices)} verts
            </div>
        </button>

        <button
            id="btn-toggle-peaks"
            class="control-btn"
            disabled={!($mapStore.initialized && $mapStore.decompressed)}
            on:click={() => benchmarkDriver.togglePeaks()}
        >
            <div class="btn-top-row">
                <span class="btn-label-group">
                    <span class="layer-icon" title="SF Landmarks & Peaks">
                        <svg viewBox="0 0 18 18" width="16" height="16" stroke="currentColor" fill="none" stroke-width="1.3">
                            <path d="M2 15 L 9 3 L 16 15 Z" stroke-linejoin="round" />
                            <circle cx="9" cy="8" r="1" fill="currentColor" stroke="none" />
                            <line x1="5.5" y1="10.5" x2="12.5" y2="10.5" stroke-width="1" stroke-dasharray="2 2" />
                        </svg>
                    </span>
                    <span>Peaks</span>
                </span>
                <span class="status-indicator" class:status-active={$mapStore.peaksVisible}>
                    {$mapStore.peaksVisible ? "ON" : "OFF"}
                </span>
            </div>
            <div class="btn-telemetry">
                {formatCount($layerStats.peaks.features)} feats | {formatCount($layerStats.peaks.vertices)} verts
            </div>
        </button>
    </div>

    <div class="section-card">
        <h2 class="section-title">Navigation</h2>
        <button
            id="btn-pan-zoom"
            class="control-btn"
            disabled={!($mapStore.initialized && $mapStore.decompressed)}
            on:click={() => benchmarkDriver.nextPanZoomIncrement()}
        >
            <div class="btn-top-row">
                <span>Pan / Zoom Step</span>
                <span class="status-indicator">Step {$mapStore.panZoomStep}</span>
            </div>
        </button>
    </div>
</aside>
