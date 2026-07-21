import { fileURLToPath } from "url";
import path from "path";
import { build } from "vite";
import { generateResourcesFile } from "../../../resources/shared/generate-resources.mjs";
import { generateDatasets } from "./generate-datasets.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distPath = path.join(rootDir, "dist");

async function runBuild() {
    console.log("1. Generating CC0 coordinate datasets...");
    generateDatasets();

    console.log("2. Compiling standalone application via Vite...");
    await build({
        root: rootDir,
        configFile: path.join(rootDir, "vite.config.js")
    });

    console.log("3. Generating resources.txt...");
    generateResourcesFile(distPath);

    console.log("Build completed successfully!");
}

runBuild().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
});
