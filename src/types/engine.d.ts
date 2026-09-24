/** @format */

import { HydratedModule, SerializedModule } from "./manifest";

/**
 * Engine-specific types for the simulation and diagram editor.
 * Updated to align with the Module Manifest architecture.
 */

export type EnginePortType = "input" | "output";

export interface DiagramModule extends HydratedModule {
  designator: string;              // "ALU1"
  displayName: string;             // "Main ALU"
  
  // Transform is already in SerializedModule via position/rotation in some schemas,
  // but let's keep it explicit for the diagram editor if needed.
  transform: { x: number; y: number; rotation: number };
}

/**
 * Re-exporting for convenience or legacy compatibility if needed
 */
export type SerializedModuleConfig = SerializedModule;

