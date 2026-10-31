/** @format */

import { ref } from 'vue';

/**
 * Reactive bridge between the active SchematicDesigner's undo history and
 * the editor toolbar (mirrors `selection-bridge`): the designer stays
 * Vue-free and SchematicEditor syncs availability into these refs.
 */

/** True when the designer's history can undo. */
export const canUndo = ref(false);

/** True when the designer's history can redo. */
export const canRedo = ref(false);

/** Syncs the reactive availability mirror with the designer's stacks. */
export function setHistoryAvailability(undo: boolean, redo: boolean): void {
  canUndo.value = undo;
  canRedo.value = redo;
}