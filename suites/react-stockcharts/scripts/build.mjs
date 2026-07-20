import { execSync } from "child_process";
import path from "path";
import fs from "fs/promises";
import { generateResourcesFile } from "../../../resources/shared/generate-resources.mjs";

const rootDir = path.join(import.meta.dirname, "..");
await fs.rm(path.join(rootDir, "dist"), { recursive: true, force: true });
await fs.rm(path.join(rootDir, "build"), { recursive: true, force: true });

execSync("npx --no-install react-scripts build", {
    stdio: "inherit",
    cwd: rootDir,
    env: { ...process.env, BUILD_PATH: "dist", SKIP_PREFLIGHT_CHECK: "true", NODE_OPTIONS: "--openssl-legacy-provider", DISABLE_ESLINT_PLUGIN: "true" }
});

await generateResourcesFile(path.join(rootDir, "dist"));
