/** @format */

import { defineConfig } from "vite";
import path from "path";

const __dirname = path.resolve();

/**
 * Minimal SSR build config for the simulation-session self-check: bundles
 * only the pure TypeScript assembler + simulation stack (no Vue / Konva /
 * CSS pipeline) into a runnable Node script. Used exclusively by
 * `npm run simulation:check`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    ssr: "src/core/simulation/simulation-smoke.ts",
    outDir: ".simulation-check",
    minify: false,
    target: "node20",
  },
});