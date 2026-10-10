/** @format */

import { ref } from "vue";

/**
 * Minimal reactive bridge between the active SchematicDesigner and Golden
 * Layout panels that observe selection or document state (the Inspector).
 * The designer itself stays Vue-free: SchematicEditor syncs designer events
 * into these refs, and panels read them alongside the imperative designer
 * API exposed through `designer-bridge`.
 */

/** Ids of the currently selected modules/wires on the active designer. */
export const selectedIds = ref<string[]>([]);

/**
 * Bumped on every committed document mutation (module add/remove/move,
 * netlist change, config change) so observers re-read live designer data.
 */
export const documentRevision = ref(0);

/** Syncs the reactive selection mirror with the designer's selection. */
export function setSelection(ids: string[]): void {
  selectedIds.value = ids;
}

/** Bumps the document revision so observers re-read live designer data. */
export function bumpDocumentRevision(): void {
  documentRevision.value++;
}
