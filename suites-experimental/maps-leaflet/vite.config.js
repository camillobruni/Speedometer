import { resolve } from "path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
    base: "./",
    plugins: [svelte()],
    build: {
        modulePreload: { polyfill: false },
        minify: false,
        sourcemap: true,
        rollupOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
            },
            output: {
                entryFileNames: "assets/[name].js",
                chunkFileNames: "assets/[name].js",
                assetFileNames: "assets/[name].[ext]",
            },
        },
    },
});
