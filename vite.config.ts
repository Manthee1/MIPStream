/** @format */

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Markdown from "unplugin-vue-markdown/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
const __dirname = path.resolve();

// https://vitejs.dev/config/
export default defineConfig({
	// base: '',
	plugins: (() => {
		const plugins: any[] = [
			vue({ include: [/\.vue$/, /\.md$/] }),
			visualizer({ filename: "dist/bundle-analyze.html", open: false, gzipSize: true, brotliSize: true }),
			Markdown({}),
			VitePWA({
				registerType: "autoUpdate", // Automatically updates the service worker
				workbox: {
					maximumFileSizeToCacheInBytes: 5 * 1024 ** 2, // 5 MB or set to something else
				},
				manifest: {
					name: "MIPStream Simulator",
					short_name: "MIPStream",
					description: "A web-based MIPS simulator for assembly programming.",
					theme_color: "#ffffff",
					background_color: "#ffffff",
					start_url: "/",
					categories: ["education", "tools", "ide"],
					//@ts-ignore - keywords exists but is not defined in the type
					keywords: ["programming", "simulation", "mips", "assembly", "cpu", "pipelining"],
					display: "standalone",
					icons: [
						{
							src: "/icons/icon-192x192.png",
							sizes: "192x192",
							type: "image/png",
						},
						{
							src: "/icons/icon-256x256.png",
							sizes: "256x256",
							type: "image/png",
						},
						{
							src: "/icons/icon-512x512.png",
							sizes: "512x512",
							type: "image/png",
						},
					],
				},
			}),
		];

		return plugins;
	})(),

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent vite from obscuring rust errors
	clearScreen: false,
	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
	},
	envPrefix: ["VITE_"],
	build: {
		target: "es2018",
		cssCodeSplit: true,
		rollupOptions: {
			output: {
				// Use content-hash for long-term caching
				entryFileNames: "assets/[name]-[hash].js",
				chunkFileNames: "assets/[name]-[hash].js",
				assetFileNames: "assets/[name]-[hash].[ext]",

				codeSplitting: {
					minSize: 100 * 1024, // Minimum size for a chunk to be created (in bytes)
					groups: [

						{
							name: '@tabler',
							priority: 25,
							test: /@tabler/,
							maxSize: 200 * 1024, // Limit the size of this chunk to 100 KB
						},
						{
							name: 'naive-ui',
							priority: 20,
							test: /node_modules[\\/]naive-ui[\\/]es/,
							maxSize: 400 * 1024, // Limit the size of this chunk to 100 KB
						},
						{
							name: '@codemirror',
							priority: 20,
							test: /@codemirror/,
						},
						{
							name: 'vendor',
							test: /node_modules/,
							priority: 10,
						}

					],

				}

			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "/src"),
		},
	},
});
