/** @format */

import { compileArchitecture, type ArchitectureDocument } from "./compile/compiler";
import { portKey } from "./compile/wire-index";
import type { CompileIssue, CompiledModule, CompiledSimulation } from "./types";

/**
 * Headless, cycle-accurate logic simulator (ENGINE_SPEC §3–§4).
 *
 * The engine owns the global signal buffer (`Uint32Array`), the compiled
 * evaluation program, and every module's internal state. It stays completely
 * decoupled from Vue — the UI only samples `wireValues` at display rate and
 * never drives cycles through reactivity.
 */
export class SimulationEngine {
  private compiled: CompiledSimulation;
  private readonly document: ArchitectureDocument;

  /** Completed master clock cycles since the last reset. */
  public cycleCount = 0;

  constructor(document: ArchitectureDocument) {
    this.document = document;
    this.compiled = compileArchitecture(document);
    this.settle();
  }

  // --------------------------------------------------------------- state read

  /** The global signal buffer — sample from the UI at display rate. */
  public get wireValues(): Uint32Array {
    return this.compiled.wireValues;
  }

  /** Compile errors from the last compilation (non-empty = not runnable). */
  public get errors(): CompileIssue[] {
    return this.compiled.errors;
  }

  /** Compile warnings from the last compilation (runnable regardless). */
  public get warnings(): CompileIssue[] {
    return this.compiled.warnings;
  }

  public get hasErrors(): boolean {
    return this.compiled.errors.length > 0;
  }

  /** Live value carried on a net, or null for an unknown net id. */
  public getNetValue(netId: string): number | null {
    const slot = this.compiled.netIndexById.get(netId);
    return slot === undefined ? null : this.compiled.wireValues[slot];
  }

  /** Live value on a module port (its net's value), or null when unknown. */
  public getPortValue(designator: string, portId: string): number | null {
    const slot = this.compiled.portIndexByKey.get(portKey(designator, portId));
    return slot === undefined ? null : this.compiled.wireValues[slot];
  }

  /**
   * Engine-owned internal state for a module (register banks, memory words),
   * for simulator panels to read/mutate. Undefined for stateless modules.
   */
  public getModuleState(designator: string): unknown {
    return this.compiled.moduleStates.get(designator);
  }

  // ---------------------------------------------------------------- execution

  /**
   * Executes one master clock cycle (ENGINE_SPEC §3):
   *
   * 1. Rising edge — sequential modules update under simultaneous-edge
   *    semantics: every module samples its inputs before anyone writes.
   * 2. Combinational propagation — the single topologically ordered pass
   *    settles all combinational logic. Level-sensitive writes (register
   *    files, data memory) commit during this pass, exactly once per cycle.
   * 3. Falling edge + final stabilization — only when falling/both-edge
   *    modules exist; otherwise nothing changed, so the second pass would
   *    only re-commit identical writes and is skipped.
   */
  public step(): void {
    const { risingModules, bothModules, fallingModules, combinationalOrder } =
      this.compiled;

    this.runSequentialEdge(risingModules, bothModules);
    this.runCombinational(combinationalOrder);

    if (fallingModules.length > 0 || bothModules.length > 0) {
      this.runSequentialEdge(fallingModules, bothModules);
      this.runCombinational(combinationalOrder);
    }

    this.cycleCount++;
  }

  /**
   * Rewinds to the initial compiled state: fresh internal states, a zeroed
   * signal buffer, and cycle 0. Equivalent to recompiling the same document.
   */
  public reset(): void {
    this.compiled = compileArchitecture(this.document);
    this.settle();
    this.cycleCount = 0;
  }

  /**
   * Propagates the combinational network once from the current sequential
   * state. Runs after compilation/reset — exactly like real hardware, where
   * the logic settles between clock edges — so the very first rising edge
   * samples steady-state inputs instead of an all-zero buffer.
   */
  private settle(): void {
    this.runCombinational(this.compiled.combinationalOrder);
  }

  /**
   * One sequential clock edge. Hardware flip-flops sample simultaneously, so
   * the edge runs in three strict sub-phases — read all inputs, evaluate all
   * modules, write all outputs — preventing same-edge ripple-through races
   * between chained registers.
   */
  private runSequentialEdge(primary: CompiledModule[], secondary: CompiledModule[]): void {
    const wires = this.compiled.wireValues;

    // Read: every module snapshots its input wires first.
    for (let i = 0; i < primary.length; i++) readInputs(wires, primary[i]);
    for (let i = 0; i < secondary.length; i++) readInputs(wires, secondary[i]);

    // Evaluate: closures compute next-state outputs into scratch buffers.
    for (let i = 0; i < primary.length; i++) evaluateOutputs(primary[i]);
    for (let i = 0; i < secondary.length; i++) evaluateOutputs(secondary[i]);

    // Write: outputs land on the wires only after everyone has sampled.
    for (let i = 0; i < primary.length; i++) writeOutputs(wires, primary[i]);
    for (let i = 0; i < secondary.length; i++) writeOutputs(wires, secondary[i]);
  }

  /** Single forward pass over the sorted combinational modules. */
  private runCombinational(order: CompiledModule[]): void {
    const wires = this.compiled.wireValues;
    for (let i = 0; i < order.length; i++) {
      const module = order[i];
      readInputs(wires, module);
      evaluateOutputs(module);
      writeOutputs(wires, module);
    }
  }
}

/** Copies a module's input wire slots into its staging buffer. */
function readInputs(wires: Uint32Array, module: CompiledModule): void {
  const { inputIndices, inputScratch } = module;
  for (let i = 0; i < inputIndices.length; i++) {
    inputScratch[i] = wires[inputIndices[i]];
  }
}

/** Runs the evaluation closure into the module's output staging buffer. */
function evaluateOutputs(module: CompiledModule): void {
  const results = module.evaluate(module.inputScratch);
  const { outputScratch } = module;
  for (let i = 0; i < outputScratch.length; i++) {
    // Closures returning fewer words than declared read as 0.
    outputScratch[i] = i < results.length ? results[i] : 0;
  }
}

/** Copies a module's staged outputs onto its wire slots. */
function writeOutputs(wires: Uint32Array, module: CompiledModule): void {
  const { outputIndices, outputScratch } = module;
  for (let i = 0; i < outputIndices.length; i++) {
    wires[outputIndices[i]] = outputScratch[i];
  }
}
