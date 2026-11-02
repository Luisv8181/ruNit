// MapLibre 6 spawns a module worker by URL, which Next's bundler can't resolve. Serve it from /public instead.
import fs from "node:fs";
fs.copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre-gl-worker.mjs");
