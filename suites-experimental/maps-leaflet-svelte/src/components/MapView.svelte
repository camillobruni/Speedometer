<script>
    import { onMount, onDestroy } from "svelte";
    import { benchmarkDriver } from "../services/benchmarkDriver.js";

    let container;

    onMount(() => {
        if (!container) {
            throw new Error("Fatal: Container DOM element not bound in MapView onMount.");
        }
        benchmarkDriver.setContainer(container);
        benchmarkDriver.initializeMap();
    });

    onDestroy(() => {
        benchmarkDriver.teardown();
    });
</script>

<div class="viewport-container">
    <div id="map-container" bind:this={container}></div>
</div>
