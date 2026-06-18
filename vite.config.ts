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
				manualChunks(id) {
					if (id.includes("node_modules")) {
						if (id.includes("@vue")) return "vendor_vue";
						if (id.includes("monaco-editor/esm/vs")) {
							// if (id.includes('vs/base')) return 'vendor_monaco_base';
							// if (id.includes('vs/common')) return 'vendor_monaco_common';
							// if (id.includes('vs/platform')) return 'vendor_monaco_platform';
							// if (id.includes('model')) return 'vendor_monaco_model';
							// if (id.includes("vs/editor")) {
								// if (id.includes("vs/editor/browser")) return "vendor_monaco-browser";
								// if (id.includes("vs/editor/contrib")) return "vendor_monaco-contrib";
								// return "vendor_monaco-editor";
							// }
							return "vendor_monaco";
						}
						if (id.includes("monaco-themes")) return "vendor_monaco_themes";
						if (id.includes("feather-icons")) return "vendor_icons";
						return "vendor_misc";
					}
				},
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "/src"),
		},
	},
});
