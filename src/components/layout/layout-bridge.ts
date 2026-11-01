import { LayoutConfig, type GoldenLayout as GoldenLayoutInstance } from "golden-layout";

/**
 * Minimal bridge between app-level flows (the project save funnel) and the
 * mounted Golden Layout instances — mirrors the schematic `designer-bridge`:
 * save flows have no direct reference to the layout components, so they pull
 * the live panel arrangement for the active perspective through this module.
 */

export type LayoutPerspective = "design" | "simulate";

const activeLayouts: Partial<Record<LayoutPerspective, GoldenLayoutInstance>> = {};

/** Registers a mounted layout instance. Pass null to detach (on unmount). */
export function setActiveLayout(
  perspective: LayoutPerspective,
  instance: GoldenLayoutInstance | null,
): void {
  if (instance) {
    activeLayouts[perspective] = instance;
  } else {
    delete activeLayouts[perspective];
  }
}

/** The mounted instance for a perspective, or null when its layout is not up. */
export function getActiveLayout(perspective: LayoutPerspective): GoldenLayoutInstance | null {
  return activeLayouts[perspective] ?? null;
}

/**
 * Serialized, directly re-loadable config (`LayoutConfig.fromResolved`) for
 * the given perspective, or null when no layout is mounted / serialization
 * fails.
 */
export function getLayoutState(perspective: LayoutPerspective): LayoutConfig | null {
  const instance = activeLayouts[perspective];
  if (!instance) return null;
  try {
    return LayoutConfig.fromResolved(instance.saveLayout());
  } catch (error) {
    console.warn(`Failed to serialize ${perspective} layout state:`, error);
    return null;
  }
}