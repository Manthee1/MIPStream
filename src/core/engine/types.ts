/** @format */

import type { ClockEdge } from "@/shared/types/manifest";

/**
 * One compiled module: a pure evaluation closure bound to flat wire-buffer
 * indices. Created once by the compiler; executed by the engine's hot loop.
 */
export interface CompiledModule {
  designator: string;
  typeId: string;
  /** Clock edge sensitivity; `undefined` marks a combinational module. */
  clockEdge: ClockEdge | undefined;
  /**
   * Wire buffer slot for each evaluator input port, in
   * `evaluators.inputPorts` order. Slot 0 is the constant-zero rail (used
   * by undriven inputs so the hot loop never branches on connectivity).
   */
  inputIndices: Int32Array;
  /** Wire buffer slot for each evaluator output port, in `evaluators.outputPorts` order. */
  outputIndices: Int32Array;
  /** Reusable input staging buffer (one entry per input port). */
  inputScratch: Uint32Array;
  /** Reusable output staging buffer (one entry per output port). */
  outputScratch: Uint32Array;
  /** The manifest's evaluation closure (internal state pre-injected at compile time). */
  evaluate: (inputs: Uint32Array) => Uint32Array;
}

/** A compile-time diagnostic for the host UI. */
export interface CompileIssue {
  severity: "error" | "warning";
  message: string;
}

/** A fully compiled simulation program: everything the run loop needs. */
export interface CompiledSimulation {
  /**
   * The global signal buffer. Slot 0 is the constant-zero rail; nets and
   * private (unconnected) output ports occupy slots 1..n.
   */
  wireValues: Uint32Array;
  /** net id → wire slot. */
  netIndexById: Map<string, number>;
  /** `designator:portId` → wire slot (inputs resolve to their driving net's slot). */
  portIndexByKey: Map<string, number>;
  /** Combinational modules in topological order (acyclic subset only). */
  combinationalOrder: CompiledModule[];
  /** Sequential modules sensitive to the rising edge. */
  risingModules: CompiledModule[];
  /** Sequential modules sensitive to the falling edge. */
  fallingModules: CompiledModule[];
  /** Sequential modules sensitive to both edges. */
  bothModules: CompiledModule[];
  /** designator → engine-owned internal state (register banks, memory words). */
  moduleStates: Map<string, unknown>;
  /** Errors: the program is not safe to run when non-empty. */
  errors: CompileIssue[];
  /** Warnings: runnable, but the user should review. */
  warnings: CompileIssue[];
}
