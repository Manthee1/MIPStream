import { SerializedModule, HydratedModule, Vector2 } from "./manifest";

export type Axis = 'X' | 'Y';

/**
 * Defines the target of a net segment.
 * It can either be an internal junction within the net or a module port.
 */
export type NetTarget = 
  | { type: 'junction'; index: number }
  | { type: 'port'; module: string; port: string };

/**
 * A segment representing a path to a target using alternating orthogonal coordinates.
 */
export interface NetSegment {
  to: NetTarget;
  firstAxis: Axis;
  /**
   * Alternating coordinates. 
   * If firstAxis is 'X', positions[0] is the new X, positions[1] is the new Y, etc.
   */
  positions: number[];
}

/**
 * A branch segment starts from an existing junction within the same net.
 */
export interface NetBranch extends NetSegment {
  from: number; // Index into the parent net's junctions array
}

/**
 * A Net represents a single output driver branching to multiple sinks.
 * It strictly enforces 1-to-N connectivity and orthogonal routing.
 */
export interface SerializedNet {
  id: string;
  driver: { module: string; port: string };
  junctions: [number, number][]; // 2D array of [x, y] coordinates
  trunk: NetSegment;             // The initial segment from the driver
  branches: NetBranch[];         // Subsequent segments branching from junctions
}

/**
 * The complete serializable state of a CPU architecture.
 */
export interface ArchitectureConfig {
  modules: SerializedModule[];
  nets: SerializedNet[];
}

/**
 * The fully rehydrated state of an architecture.
 * Ready for the editor and simulation engine.
 */
export interface HydratedArchitecture {
  modules: HydratedModule[];
  nets: SerializedNet[]; // Keeping the serialized structure for now as it's the source of truth
}

