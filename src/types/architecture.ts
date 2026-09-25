import { ModuleManifest, PortDefinition, SerializedModule as BaseSerializedModule, Vector2 } from "./manifest";

export type Axis = 'X' | 'Y';

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

export interface ArchitectureConfig {
  modules: SerializedModule[];
  nets: SerializedNet[];
}

/**
 * --- 2. HYDRATED LAYER (Editor UI) ---
 */

export interface HydratedModule extends SerializedModule {
  manifest: ModuleManifest;
  ports: PortDefinition[];
  isValid: boolean;
  errors: string[];
}

export interface HydratedArchitecture {
  modules: HydratedModule[];
  nets: SerializedNet[]; 
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

