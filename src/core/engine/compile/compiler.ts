/** @format */

import type { CompileIssue, CompiledModule, CompiledSimulation } from "../types";
import { WireIndex, ZERO_SLOT, portKey } from "./wire-index";
import { topologicalSort, type TopoEdge } from "./topological-sort";
import { resolveArchitecture, type ArchitectureDocument } from "./resolver";

export type { ArchitectureDocument } from "./resolver";

/**
 * Compiles a serialized architecture into a runnable program
 * (ENGINE_SPEC §2). Module/net resolution and netlist validation live in
 * `resolver.ts` (shared with the designer's lint pass); this stage binds the
 * validated document to flat wire-buffer slots, builds per-module scratch
 * buffers, and orders the combinational graph topologically, flagging
 * illegal unbuffered combinational loops as compile errors instead of
 * hanging the evaluation loop.
 */
export function compileArchitecture(document: ArchitectureDocument): CompiledSimulation {
  const { builds, resolvedNets, errors, warnings } = resolveArchitecture(document);
  const wireIndex = new WireIndex();

  // --- 1. Bind validated nets to wire slots.

  // One slot per net. An output port already driving another net reuses its
  // slot so both nets read the identical driven value.
  for (const net of resolvedNets) {
    const sourceSlot =
      wireIndex.getPortSlot(net.source.designator, net.source.portId) ??
      wireIndex.allocateSlot();
    wireIndex.registerNet(net.netId, sourceSlot);
    wireIndex.registerPort(net.source.designator, net.source.portId, sourceSlot);
    for (const target of net.targets) {
      wireIndex.registerPort(target.designator, target.portId, sourceSlot);
    }
  }

  // --- 2. Compile modules: slots, scratch buffers, and edge lists.

  const combinational: CompiledModule[] = [];
  const risingModules: CompiledModule[] = [];
  const fallingModules: CompiledModule[] = [];
  const bothModules: CompiledModule[] = [];
  const moduleStates = new Map<string, unknown>();
  const combinationalIds = new Set<string>();

  for (const build of builds.values()) {
    const { evaluators } = build;

    // Input slots: the driving net's slot, or the constant-zero rail when
    // undriven — the hot loop then never branches on connectivity. Undriven
    // inputs are registered on the zero rail so runtime probing reads 0.
    const inputIndices = new Int32Array(evaluators.inputPorts.length);
    for (let i = 0; i < evaluators.inputPorts.length; i++) {
      const portId = evaluators.inputPorts[i];
      const slot = wireIndex.getPortSlot(build.designator, portId);
      if (slot === undefined) {
        inputIndices[i] = ZERO_SLOT;
        wireIndex.registerPort(build.designator, portId, ZERO_SLOT);
        if (!build.ports.has(portId)) {
          warnings.push({
            severity: "warning",
            message: `Module "${build.designator}" evaluates unknown input port "${portId}" (reads 0).`,
            refs: [build.designator, portKey(build.designator, portId)],
          });
        }
      } else {
        inputIndices[i] = slot;
      }
    }

    // Output slots: the sourced net's slot, or a private slot for
    // unconnected outputs so runtime probing can still read their values.
    const outputIndices = new Int32Array(evaluators.outputPorts.length);
    for (let i = 0; i < evaluators.outputPorts.length; i++) {
      const portId = evaluators.outputPorts[i];
      let slot = wireIndex.getPortSlot(build.designator, portId);
      if (slot === undefined) {
        slot = wireIndex.allocateSlot();
        wireIndex.registerPort(build.designator, portId, slot);
      }
      outputIndices[i] = slot;
    }

    for (const [portId, port] of build.ports) {
      if (port.direction === "output" && !evaluators.outputPorts.includes(portId)) {
        warnings.push({
          severity: "warning",
          message: `Module "${build.designator}" output "${portId}" is never evaluated (stays 0).`,
          refs: [portKey(build.designator, portId)],
        });
      }
    }

    const compiledModule: CompiledModule = {
      designator: build.designator,
      typeId: build.typeId,
      clockEdge: evaluators.clockEdge,
      inputIndices,
      outputIndices,
      inputScratch: new Uint32Array(evaluators.inputPorts.length),
      outputScratch: new Uint32Array(evaluators.outputPorts.length),
      evaluate: evaluators.evaluate,
    };

    if (build.state !== undefined) moduleStates.set(build.designator, build.state);

    switch (evaluators.clockEdge) {
      case undefined:
        combinational.push(compiledModule);
        combinationalIds.add(build.designator);
        break;
      case "rising":
        risingModules.push(compiledModule);
        break;
      case "falling":
        fallingModules.push(compiledModule);
        break;
      case "both":
        bothModules.push(compiledModule);
        break;
    }
  }

  // --- 3. Topologically order the combinational graph.

  // One edge per net crossing between two combinational modules. Sequential
  // modules are graph boundaries — their outputs are held in the wire buffer
  // between edges, so register feedback never forms a false cycle.
  const edges: TopoEdge[] = [];
  for (const net of resolvedNets) {
    if (!combinationalIds.has(net.source.designator)) continue;
    for (const target of net.targets) {
      if (combinationalIds.has(target.designator)) {
        edges.push({ from: net.source.designator, to: target.designator });
      }
    }
  }

  const { order, cyclic } = topologicalSort([...combinationalIds], edges);
  if (cyclic.length > 0) {
    errors.push({
      severity: "error",
      message: `Unbuffered combinational loop through: ${cyclic.join(", ")}. Insert a stage register to break the cycle.`,
      refs: cyclic,
    });
  }

  const byDesignator = new Map(combinational.map((module) => [module.designator, module]));
  const combinationalOrder: CompiledModule[] = [];
  for (const id of order) {
    const module = byDesignator.get(id);
    if (module) combinationalOrder.push(module);
  }

  return {
    wireValues: new Uint32Array(wireIndex.slotCount),
    netIndexById: wireIndex.netIndexById,
    portIndexByKey: wireIndex.portIndexByKey,
    combinationalOrder,
    risingModules,
    fallingModules,
    bothModules,
    moduleStates,
    errors,
    warnings,
  };
}
