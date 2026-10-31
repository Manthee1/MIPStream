import { ModuleManifest, PortDefinition, SerializedModule as BaseSerializedModule, Pos, HydratedModule } from "./manifest";
import type { SerializedNet } from "./netlist";
import type { AssemblerConfig } from "./isa";

/**
 * PDL (Processor Description Language) - Defines instruction formats and machine layout.
 * Reuses the shared assembler model: fields carry explicit bit `ranges`
 * (overlapping and multi-range fields are legal), plus instruction types and
 * the concrete instruction set the legacy Assembler consumes directly.
 */
export type ISADefinition = AssemblerConfig;


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
}

export interface ArchitectureConfiguration {
  pipeline: {
    enabled: boolean;
    stages: PipelineStageConfig[];
    startStageBoundary?: string;
  };
  assembler: {
    /**
     * One editor may assemble its program into multiple instruction
     * memories (one-to-many): each row carries the target designators.
     */
    mappings: {
      editorId: string;
      memoryModuleIds: string[];
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

