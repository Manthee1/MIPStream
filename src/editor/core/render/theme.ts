/** @format */

import type { RenderTheme } from "@/shared/types/manifest";

/** Reads a CSS custom property from the document root, falling back when unset. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Memoized theme tokens — see `readRenderTheme`. */
let cachedTheme: RenderTheme | null = null;

function invalidateCachedTheme(): void {
  cachedTheme = null;
}

if (typeof window !== "undefined") {
  // `useTheme` dispatches this app-wide event right after the `dark` class
  // flips, so the fresh CSS variables are already resolvable once the cache
  // empties and the next read re-resolves them.
  window.addEventListener("theme-change", invalidateCachedTheme);
}

/**
 * Resolves the canvas color tokens from the global theme variables.
 *
 * Memoized per theme: this is a hot path — runtime signal recolors, port
 * value label writes, hover highlights, and grid re-renders all read it, and
 * a raw resolve costs ten `getComputedStyle` calls (thousands per frame on a
 * running simulation). Invalidated on theme switches.
 */
export function readRenderTheme(): RenderTheme {
  if (cachedTheme !== null) return cachedTheme;

  cachedTheme = Object.freeze({
    bodyFill: cssVar("--bg-surface", "#ffffff"),
    bodyStroke: cssVar("--border-color", "#334155"),
    selected: cssVar("--color-primary", "#5a82d8"),
    text: cssVar("--text-primary", "#0f172a"),
    accent: cssVar("--color-primary", "#5a82d8"),
    valid: cssVar("--color-success", "#10b981"),
    danger: cssVar("--color-danger", "#ef4444"),
    signalOn: cssVar("--color-success", "#10b981"),
    signalOff: cssVar("--color-secondary", "#94a3b8"),
    warning: cssVar("--color-warning", "#f59e0b"),
  });
  return cachedTheme;
}
