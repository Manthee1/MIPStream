/** @format */

import { defineConfig } from "vite";
import path from "path";

const __dirname = path.resolve();

/**
 * Minimal SSR build config for the assembly-language support self-check
 * (parser, lint mapping, labels, instruction highlight): bundles the pure
 * TypeScript editor-language modules (no Vue / Konva / CSS pipeline) into a
 * runnable Node script. Used exclusively by `npm run language:check`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    ssr: "src/simulator/language/language-smoke.ts",
    outDir: ".language-check",
    minify: false,
    target: "node20",
  },
});
