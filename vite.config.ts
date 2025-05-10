import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Markdown from 'unplugin-vue-markdown/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
const __dirname = path.resolve();

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  // base: '',
  plugins: [
    vue({ include: [/\.vue$/, /\.md$/] }),
    Markdown({}),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the service worker
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 ** 2, // 5 MB or set to something else
      },
      manifest: {

        name: 'MIPStream Simulator',
        short_name: 'MIPStream',
        description: 'A web-based MIPS simulator for assembly programming.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        start_url: '/',
        categories: ['education', 'tools', 'ide',],
        //@ts-ignore - keywords exists but is not defined in the type
        keywords: ['programming', 'simulation', 'mips', 'assembly', 'cpu', 'pipelining'],
        display_override: ['window-controls-overlay', 'minimal-ui'],
        display: 'fullscreen',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],

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
