/** @format */

import type { SchematicDesigner } from "./designer";
import type { SerializedModule } from "@/shared/types/manifest";
import type { SerializedNet } from "@/shared/types/netlist";

/** Serializable snapshot of the live schematic document. */
export interface ArchitectureSnapshot {
  modules: SerializedModule[];
  nets: SerializedNet[];
}

/**
 * Minimal bridge between app-level flows (e.g. Ctrl+S save) and the active
 * SchematicDesigner instance. Mirrors the placement bridge: the save flow
 * has no direct reference to the designer, so it requests a snapshot of the
 * live architecture through this module.
 */
let activeDesigner: SchematicDesigner | null = null;

/** Registers the mounted designer. Pass null to detach (e.g. on unmount). */
export function setActiveDesigner(designer: SchematicDesigner | null): void {
  activeDesigner = designer;
}

/** The currently mounted designer, or null outside the schematic canvas. */
export function getActiveDesigner(): SchematicDesigner | null {
  return activeDesigner;
}

/**
 * Pulls the current serialized architecture from the active designer, or
 * null when no schematic canvas is mounted.
 */
export function requestArchitectureSnapshot(): ArchitectureSnapshot | null {
  if (!activeDesigner) return null;
  return {
    modules: activeDesigner.getSerializedModules(),
    nets: activeDesigner.getNets(),
  };
}
