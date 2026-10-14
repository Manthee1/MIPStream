/** @format */

import type { SerializedModule } from "@/shared/types/manifest";
import type { SerializedNet } from "@/shared/types/netlist";

/** In-memory designer clipboard: deep-copied modules + their internal nets. */
export interface DesignerClipboard {
  modules: SerializedModule[];
  nets: SerializedNet[];
  /** Consecutive pastes since the copy — grows the paste offset. */
  pasteCount: number;
}

/**
 * Module-level clipboard singleton (survives perspective switches; purely
 * in-memory — no OS clipboard integration by design).
 */
let clipboard: DesignerClipboard | null = null;

/** Stores a copied selection (module data + fully-internal nets). */
export function setClipboard(modules: SerializedModule[], nets: SerializedNet[]): void {
  clipboard = { modules, nets, pasteCount: 0 };
}

/** The current clipboard contents, or null when empty. */
export function getClipboard(): DesignerClipboard | null {
  return clipboard;
}

/** Clears the clipboard. */
export function clearClipboard(): void {
  clipboard = null;
}
