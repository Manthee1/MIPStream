import { ModuleManifest, PortDefinition, SerializedModule as BaseSerializedModule, Pos, HydratedModule } from "./manifest";
import type { SerializedNet } from "./netlist";

/**
 * PDL (Processor Description Language) - Defines instruction formats and machine layout.
 */
export interface ISADefinition {
  format_name: string;
  total_bits: number;
  fields: {
    name: string;
    bits: number;
    type: 'constant' | 'register' | 'immediate' | 'address';
  }[];
  instructions: {
    mnemonic: string;
    field_values: Record<string, number>;
    operands: string[];
  }[];
}

/**
 * --- 1. SERIALIZED LAYER (Persistence) ---
 */

export interface SerializedModule extends BaseSerializedModule {
  // Inherits id, typeId, position, rotation, config
}

// Canonical serialized net shape used by the schematic editor and persisted
// with projects: source/targets endpoints plus routing waypoints and branches.
export type { SerializedNet };

export interface PipelineStageConfig {
  id: string;
  name: string;
  color?: string;
}

/**
 * Schematic canvas grid configuration for the architecture.
 */
export interface GridSettings {
  /** Master visibility toggle — independent of the render style. */
  show: boolean;
  /** Render style when shown. */
  style: 'lines' | 'dots';
  /** Base grid size in scene units — drives placement and movement snapping. */
  size: number;
}

export interface ArchitectureConfiguration {
  pipeline: {
    enabled: boolean;
    stages: PipelineStageConfig[];
    startStageBoundary?: string;
  };
  assembler: {
    mappings: {
      editorId: string;
      memoryModuleId: string;
    }[];
  };
  isa: ISADefinition;
  /**
   * Schematic editor grid configuration.
   * Falls back to the editor defaults when absent (legacy projects).
   */
  grid?: GridSettings;
}

export interface ArchitectureConfig {
  name: string;
  description: string;
  modules: SerializedModule[];
  nets: SerializedNet[];
  configuration: ArchitectureConfiguration;
}

/**
 * --- 2. HYDRATED LAYER (Editor UI) ---
 */

export interface HydratedArchitecture {
  modules: HydratedModule[];
  nets: SerializedNet[];
  configuration: ArchitectureConfiguration;
}

/**
 * --- 3. RUNTIME LAYER (Simulation Engine) ---
 */

export interface RuntimeModule {
  id: string;
  evaluate: (inputs: Uint32Array) => Uint32Array;
  /** Indices into the Engine's global wire state Uint32Array */
  inputIndices: number[];
  outputIndices: number[];
  clockEdge?: 'rising' | 'falling' | 'both';
}

export interface SimulationState {
  wireValues: Uint32Array;
  cycleCount: number;
  isRunning: boolean;
}

