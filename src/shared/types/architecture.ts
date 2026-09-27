import { ModuleManifest, PortDefinition, SerializedModule as BaseSerializedModule, Vector2, HydratedModule } from "./manifest";

export type Axis = 'X' | 'Y';

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

export type NetTarget = 
  | { type: 'junction'; index: number }
  | { type: 'port'; moduleId: string; portId: string };

export interface NetSegment {
  to: NetTarget;
  firstAxis: Axis;
  positions: number[];
}

export interface NetBranch extends NetSegment {
  fromJunctionIndex: number; 
}

export interface SerializedNet {
  id: string;
  driver: { moduleId: string; portId: string };
  junctions: [number, number][];
  trunk: NetSegment;             
  branches: NetBranch[];         
}

export interface PipelineStageConfig {
    id: string;
    name: string;
    color?: string;
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

