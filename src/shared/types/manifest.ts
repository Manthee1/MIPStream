/** @format */

import type Konva from "konva";
import type { Component } from "vue";

export type PortDirection = "input" | "output";

export type ModuleCategory = "logic" | "memory" | "iO" | "custom";

export interface Pos {
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
  position?: Pos;
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


export interface ModulePropertySchema {
  key: string; // Config property key
  label: string; // Human-readable label for UI
  type: "number" | "string" | "boolean" | "select"; // Data type
  default?: any; // Default value if not provided
  options?: any[]; // For 'select' type, the list of valid options
  min?: number; // For 'number' type, minimum value
  max?: number; // For 'number' type, maximum value
  step?: number; // For 'number' type, step increment
  tooltip?: string; // Optional tooltip for UI guidance
}

/**
 * Canvas color tokens supplied by the editor renderer at draw time.
 * Values are resolved from the global CSS theme variables so module draw
 * functions never hardcode colors.
 */
export interface RenderTheme {
  bodyFill: string;
  bodyStroke: string;
  /** Highlight color for selected elements. */
  selected: string;
  text: string;
  /** Accent used for ports and control points. */
  accent: string;
  /** Highlight color for legally connectable targets while routing. */
  valid: string;
  /** Highlight color for delete-tool hover feedback. */
  danger: string;
}

/** Runtime mode the module is being drawn for. */
export type RenderMode = "editor" | "viewer";

/** Input parameters handed to a manifest's custom draw function. */
export interface ModuleRenderOptions<TConfig = any> {
  /** Fully resolved (defaults + overrides) module configuration. */
  config: TConfig;
  /** Relative port definitions — the single source of truth for connectivity. */
  ports: PortDefinition[];
  /** Current rotation in degrees (0 | 90 | 180 | 270). */
  rotation: number;
  mode: RenderMode;
  /** Human-readable module label. */
  label: string;
  /** Resolved theme tokens. */
  theme: RenderTheme;
}

/** Physical size of the drawn module body (unrotated bounding box). */
export interface ModuleRenderOutput {
  width: number;
  height: number;
}

/**
 * The static definition of a logic component type.
 */
export interface ModuleManifest<TConfig = any> {
  typeId: string;      // Unique identifier (e.g., "std.mux", "std.alu")
  label: string;       // Human-readable name (e.g., "Multiplexer")
  description: string; // Markdown content (imported from .md)
  icon: string;        // SVG content (imported from .svg)
  category: ModuleCategory;   // Optional grouping (e.g., "Logic", "Memory")

  /**
   * Optional panel component for the simulator view.
   * This component will be rendered when the module is inspected during simulation.
   */
  panel?: Component;

  defaultConfig: TConfig;

  configSchema?: ModulePropertySchema[]; // Optional schema for UI config editors

  /**
   * Custom draw function for the module body. Draw in module-local coordinates
   * around the origin (0,0); the caller applies position/rotation via the
   * group transform. Port visuals are drawn by the editor renderer from the
   * same `ports` array, guaranteeing visual/logical port sync.
   * When omitted, a default body is derived from the port layout.
   */
  render?: (group: Konva.Group, options: ModuleRenderOptions<TConfig>) => ModuleRenderOutput;


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
  designator: string;          // Unique instance ID (e.g., "u1")
  typeId: string;      // Reference to the manifest
  position: Pos;
  rotation: number;
  config: Record<string, any>; // User-defined overrides
}


/**
 * A fully rehydrated module instance ready for simulation and rendering.
 */
export interface HydratedModule extends SerializedModule {
  manifest: ModuleManifest;
  ports: PortDefinition[];
  evaluators: ModuleEvaluators;
  /** Editor-only metadata */
  isValid?: boolean;
  errors?: string[];
}
