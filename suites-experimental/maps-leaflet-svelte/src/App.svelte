<script>
    import { onMount } from "svelte";
    import ControlPanel from "./components/ControlPanel.svelte";
    import MapView from "./components/MapView.svelte";
    import { loadRawBuffers } from "./services/dataLoader.js";

    let isReady = false;

    onMount(async () => {
        await loadRawBuffers();
        isReady = true;
    });
</script>

<main class="app-layout">
    {#if isReady}
        <div id="app-ready-indicator"></div>
        <ControlPanel />
        <MapView />
    {/if}
</main>
