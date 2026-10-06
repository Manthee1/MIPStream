/** @format */

import { ref } from "vue";

/**
 * Minimal command bridge between the module palette (a separate Golden Layout
 * panel) and the active SchematicDesigner instance. The palette has no direct
 * reference to the designer, so it requests placement through this module.
 */
type PlacementRequestListener = (typeId: string) => void;
type PlacementCancelListener = () => void;

let listener: PlacementRequestListener | null = null;
let cancelListener: PlacementCancelListener | null = null;

/**
 * Reactive mirror of the designer's pending placement, so palette panels can
 * highlight the module that is about to be stamped. Maintained by the
 * designer; cleared when placement is cancelled or a tool/module is switched.
 */
export const pendingPlacementTypeId = ref<string | null>(null);

/** Registers the designer-side handler. Pass null to detach (e.g. on destroy). */
export function setPlacementListener(fn: PlacementRequestListener | null): void {
  listener = fn;
}

/** Registers the designer-side cancel handler. Pass null to detach. */
export function setPlacementCancelListener(fn: PlacementCancelListener | null): void {
  cancelListener = fn;
}

/** Requests that the active designer enter "Select & Place" mode for a module type. */
export function requestPlacement(typeId: string): void {
  listener?.(typeId);
}

/** Requests that the active designer abandon its pending placement. */
export function requestCancelPlacement(): void {
  cancelListener?.();
}
