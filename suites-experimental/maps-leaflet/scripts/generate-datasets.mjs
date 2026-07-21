import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../src/data");
const rawDir = path.resolve(__dirname, "../src/data-raw");

export function roundCoordinates(coords) {
    if (Array.isArray(coords)) {
        if (typeof coords[0] === "number") {
            return coords.map(val => Number(val.toFixed(6)));
        }
        return coords.map(item => roundCoordinates(item));
    }
    return coords;
}

function countVertices(coords) {
    if (!Array.isArray(coords)) return 0;
    if (coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number") {
        return 1;
    }
    return coords.reduce((sum, item) => sum + countVertices(item), 0);
}

export function generateDatasets() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    const gitignorePath = path.join(dataDir, ".gitignore");
    fs.writeFileSync(gitignorePath, "*\n!.gitignore\n", "utf8");

    const datasets = ["routes", "rivers", "peaks", "parks", "buildings", "transit"];
    let totalFeatures = 0;
    let totalVertices = 0;

    console.log(`Decompressing and extracting U.S. Census Bureau TIGER/Line CC0 vector datasets to ${dataDir}:`);

    for (const name of datasets) {
        const gzPath = path.join(rawDir, `${name}.json.gz`);
        const outPath = path.join(dataDir, `${name}.json`);

        if (!fs.existsSync(gzPath)) {
            throw new Error(`Compressed dataset archive not found at ${gzPath}. Please ensure src/data-raw/ is populated.`);
        }

        const compressed = fs.readFileSync(gzPath);
        const decompressed = zlib.gunzipSync(compressed);
        const data = JSON.parse(decompressed.toString("utf8"));

        const quantizedData = data.map(feature => {
            const copy = { ...feature };
            if (copy.coordinates) {
                copy.coordinates = roundCoordinates(copy.coordinates);
            }
            return copy;
        });

        fs.writeFileSync(outPath, JSON.stringify(quantizedData), "utf8");

        let featureVertices = 0;
        for (const feat of quantizedData) {
            featureVertices += countVertices(feat.coordinates);
        }

        console.log(` - ${name}.json (${quantizedData.length} features, ~${featureVertices} vertices)`);
        totalFeatures += quantizedData.length;
        totalVertices += featureVertices;
    }

    console.log(`Extraction complete. Total features: ${totalFeatures}, Total vertices: ${totalVertices}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    generateDatasets();
}
