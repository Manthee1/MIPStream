/** @format */

/**
 * Minimal command bridge between the module palette (a separate Golden Layout
 * panel) and the active SchematicDesigner instance. The palette has no direct
 * reference to the designer, so it requests placement through this module.
 */
type PlacementRequestListener = (typeId: string) => void;

let listener: PlacementRequestListener | null = null;

/** Registers the designer-side handler. Pass null to detach (e.g. on destroy). */
export function setPlacementListener(fn: PlacementRequestListener | null): void {
  listener = fn;
}

/** Requests that the active designer enter "Select & Place" mode for a module type. */
export function requestPlacement(typeId: string): void {
  listener?.(typeId);
}
