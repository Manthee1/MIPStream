/** @format */

import { defineConfig } from "vite";
import path from "path";

const __dirname = path.resolve();

/**
 * Minimal SSR build config for the assembler self-check: bundles only the pure
 * TypeScript assembler (no Vue / Konva / CSS pipeline) into a runnable Node
 * script. Used exclusively by `npm run assembler:check`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    ssr: "src/core/assembler/assembler-smoke.ts",
    outDir: ".assembler-check",
    minify: false,
    target: "node20",
  },
});