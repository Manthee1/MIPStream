import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Markdown from 'vite-plugin-md'
import path from 'path';
const __dirname = path.resolve();

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  // base: '',
  plugins: [vue({
    include: [/\.vue$/, /\.md$/],
  }), Markdown()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,

    host: host || false,
    hmr: host
      ? {
        protocol: 'ws',
        host,
        port: 1421,
      } : undefined,

    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '/src'),
    },
  }
});
