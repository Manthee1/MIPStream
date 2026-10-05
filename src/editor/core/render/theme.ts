/** @format */

import type { RenderTheme } from "@/shared/types/manifest";

/** Reads a CSS custom property from the document root, falling back when unset. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Resolves the canvas color tokens from the global theme variables.
 * Called per node creation so runtime theme (dark/light) switches are picked up.
 */
export function readRenderTheme(): RenderTheme {
  return {
    bodyFill: cssVar("--bg-surface", "#ffffff"),
    bodyStroke: cssVar("--border-color", "#334155"),
    selected: cssVar("--color-primary", "#5a82d8"),
    text: cssVar("--text-primary", "#0f172a"),
    accent: cssVar("--color-primary", "#5a82d8"),
  };
}
