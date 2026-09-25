/** @format */

export type PortDirection = "input" | "output";

export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Structural port data defined by the manifest.
 */
export interface PortDefinition {
  id: string;          // Immutable key used for wiring (e.g., "in0", "sel")
  direction: PortDirection;
  bits: number;        // Bus width
  label: string;       // Default visual label (e.g., "In 0")
  tooltip?: string;    // Optional tooltip for UI
  /**
   * Relative position of the port on the component body.
   * (0,0) is the module center/origin.
   */
  position?: Vector2;
}

/**
 * Clock edge sensitivity for sequential modules.
 */
export type ClockEdge = "rising" | "falling" | "both";

/**
 * Pure simulation evaluation closures.
 * Optimized for performance using Uint32Array.
 */
export interface ModuleEvaluators {
  /**
   * The ordered list of input port IDs corresponding to the indices in the Uint32Array
   * passed to the evaluate function.
   */
  inputPorts: string[];

  /**
   * The ordered list of output port IDs corresponding to the indices in the Uint32Array
   * returned by the evaluate function.
   */
  outputPorts: string[];

  /**
   * Pure evaluation logic.
   * If `clockEdge` is undefined, this is treated as combinational logic (runs whenever inputs change).
   * If `clockEdge` is defined, the engine runs this function only on the specified clock transition.
   * 
   * Inputs/Outputs are mapped via inputPorts/outputPorts order.
   */
  evaluate: (inputs: Uint32Array) => Uint32Array;

  /**
   * Optional clock edge sensitivity. 
   * Presence of this field indicates a sequential/synchronous module.
   */
  clockEdge?: ClockEdge;
}

/**
 * The static definition of a logic component type.
 */
export interface ModuleManifest<TConfig = any> {
  typeId: string;      // Unique identifier (e.g., "std.mux", "std.alu")
  defaultConfig: TConfig;
  
  /**
   * Generates port definitions based on a specific configuration.
   */
  generatePorts: (config: TConfig) => PortDefinition[];
  
  /**
   * Factory for simulation evaluation functions.
   */
  createEvaluators: (config: TConfig) => ModuleEvaluators;
}

/**
 * Data-only representation of a module instance, suitable for JSON serialization.
 */
export interface SerializedModule {
  id: string;          // Unique instance ID (e.g., "u1")
  typeId: string;      // Reference to the manifest
  position: Vector2;
  rotation: number;
  config: Record<string, any>; // User-defined overrides
}

/**
 * A fully rehydrated module instance ready for simulation and rendering.
 */
export interface HydratedModule extends SerializedModule {
  ports: PortDefinition[];
  evaluators: ModuleEvaluators;
}
