/** @format */

import { defineConfig } from "vite";
import path from "path";

const __dirname = path.resolve();

/**
 * Minimal SSR build config for the engine self-check: bundles only the pure
 * TypeScript engine (no Vue / Konva / CSS pipeline) into a runnable Node
 * script. Used exclusively by `npm run engine:check`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    ssr: "src/core/engine/engine-smoke.ts",
    outDir: ".engine-check",
    minify: false,
    target: "node20",
  },
});
