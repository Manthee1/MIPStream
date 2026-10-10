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


/** One selectable option of a 'select' schema property. */
export interface SelectOption {
  label: string;
  value: number | string;
}

export interface ModulePropertySchema {
  key: string; // Config property key
  label: string; // Human-readable label for UI
  type: "number" | "string" | "boolean" | "select"; // Data type
  default?: number | string | boolean; // Default value if not provided
  /** For 'select' type, the list of selectable options. */
  options?: SelectOption[];
  min?: number; // For 'number' type, minimum value
  max?: number; // For 'number' type, maximum value
  step?: number; // For 'number' type, step increment
  placeholder?: string; // Optional placeholder for text inputs
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
 * Props contract for a manifest's simulator panel.
 *
 * The simulator host supplies the resolved config, the module's live state
 * (the engine-owned storage created via `createInitialState` — the same
 * buffers the engine evaluates against), and a `revision` counter it bumps
 * on every sampling frame so panels re-render external engine updates.
 * Panels mutate the shared buffers directly and emit `update` afterwards.
 */
export interface ModulePanelProps<TConfig = Record<string, unknown>, TState = unknown> {
  config: TConfig;
  state: TState;
  revision?: number;
}

/**
 * Props contract for a manifest's custom config editor (rendered by the
 * designer's Inspector panel when `ModuleManifest.configEditor` is set).
 * The host supplies the resolved config and applies every emitted update
 * through the designer's `setModuleConfig` — the editor never mutates the
 * config object directly.
 */
export interface ModuleConfigEditorProps<TConfig = Record<string, unknown>> {
  config: TConfig;
  designator?: string;
  "onUpdate:config"?: (config: TConfig) => void;
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

  /**
   * Optional fully custom editor component for the designer's Inspector
   * panel. When present it replaces the generic schema-driven form — use it
   * for advanced configurations (e.g. the Control Unit's signal table).
   */
  configEditor?: Component;

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

  /**
   * Optional factory for a module's internal storage (register banks,
   * memory arrays). The engine calls this once per module instance and then
   * passes the returned state reference back **through the config** when
   * invoking `createEvaluators`, so the returned evaluation closures capture
   * it. Manifests/components never own state beyond this pure initialization
   * — all runtime state lives in the engine.
   */
  createInitialState?: (config: TConfig) => unknown;
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
