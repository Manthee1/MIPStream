/** @format */

import { getManifest } from "@/shared/manifestRegistry";
import type {
  ModuleEvaluators,
  PortDefinition,
  SerializedModule,
} from "@/shared/types/manifest";
import type { SerializedNet } from "@/shared/types/netlist";
import type { CompiledModule, CompiledSimulation, CompileIssue } from "../types";
import { WireIndex, ZERO_SLOT, portKey } from "./wire-index";
import { topologicalSort, type TopoEdge } from "./topological-sort";

/** Serialized document shape the compiler accepts (modules + nets). */
export interface ArchitectureDocument {
  modules?: SerializedModule[];
  nets?: SerializedNet[];
}

/** A module resolved against its manifest, ready for wire-slot binding. */
interface ModuleBuild {
  designator: string;
  typeId: string;
  ports: Map<string, PortDefinition>;
  evaluators: ModuleEvaluators;
  /** Internal state created via `createInitialState` (engine-owned). */
  state: unknown;
  /** True when the evaluator declares a clock edge (sequential module). */
  sequential: boolean;
}

/** A live endpoint reference on a resolved net. */
interface NetEndpointRef {
  designator: string;
  portId: string;
}

/** A net resolved to its source port plus its surviving target inputs. */
interface ResolvedNet {
  source: NetEndpointRef;
  targets: NetEndpointRef[];
}

/**
 * Compiles a serialized architecture into a runnable program
 * (ENGINE_SPEC §2): resolves modules against the manifest registry, binds
 * every port to a flat wire-buffer slot, orders the combinational graph
 * topologically, and flags illegal unbuffered combinational loops as
 * compile errors instead of hanging the evaluation loop.
 */
export function compileArchitecture(document: ArchitectureDocument): CompiledSimulation {
  const errors: CompileIssue[] = [];
  const warnings: CompileIssue[] = [];
  const wireIndex = new WireIndex();

  // --- 1. Resolve modules against the manifest registry.

  const builds = new Map<string, ModuleBuild>();
  for (const serialized of document.modules ?? []) {
    if (builds.has(serialized.designator)) {
      errors.push({
        severity: "error",
        message: `Duplicate module designator "${serialized.designator}" — keeping the first instance.`,
      });
      continue;
    }

    const manifest = getManifest(serialized.typeId);
    if (!manifest) {
      errors.push({
        severity: "error",
        message: `Module "${serialized.designator}" references unknown type "${serialized.typeId}".`,
      });
      continue;
    }

    // Same resolution rules as `hydrateModule`: defaults + user overrides.
    const config: Record<string, unknown> = {
      ...manifest.defaultConfig,
      ...(serialized.config ?? {}),
    };

    const ports = new Map<string, PortDefinition>();
    for (const port of manifest.generatePorts(config)) {
      ports.set(port.id, port);
    }

    // Engine-owned internal state, injected back through the config so the
    // evaluation closures capture it. The injection stays local to the
    // engine — it must never leak into serialized/persisted configs.
    const state = manifest.createInitialState?.(config);
    const evaluators = manifest.createEvaluators(
      state === undefined ? config : { ...config, state }
    );

    builds.set(serialized.designator, {
      designator: serialized.designator,
      typeId: serialized.typeId,
      ports,
      evaluators,
      state,
      sequential: evaluators.clockEdge !== undefined,
    });
  }

  // --- 2. Resolve nets into wire slots.

  /** port key → net id currently driving that input (one driver per input). */
  const drivenInputs = new Map<string, string>();
  const resolvedNets: ResolvedNet[] = [];

  for (const net of document.nets ?? []) {
    if (wireIndex.netIndexById.has(net.id)) {
      errors.push({
        severity: "error",
        message: `Duplicate net id "${net.id}" — keeping the first net.`,
      });
      continue;
    }

    const sourceBuild = builds.get(net.source.designator);
    const sourcePort = sourceBuild?.ports.get(net.source.portId);
    if (!sourceBuild || !sourcePort || sourcePort.direction !== "output") {
      errors.push({
        severity: "error",
        message: `Net "${net.id}" has no valid source port — skipped.`,
      });
      continue;
    }

    // One slot per net. An output port already driving another net reuses
    // its slot so both nets read the identical driven value.
    const sourceSlot =
      wireIndex.getPortSlot(net.source.designator, net.source.portId) ??
      wireIndex.allocateSlot();
    wireIndex.registerNet(net.id, sourceSlot);
    wireIndex.registerPort(net.source.designator, net.source.portId, sourceSlot);

    const targets: NetEndpointRef[] = [];
    for (const target of net.targets ?? []) {
      const key = portKey(target.designator, target.portId);
      if (drivenInputs.has(key)) {
        errors.push({
          severity: "error",
          message: `Input "${key}" is driven by nets "${drivenInputs.get(key)}" and "${net.id}" — keeping the first driver.`,
        });
        continue;
      }

      const targetBuild = builds.get(target.designator);
      const targetPort = targetBuild?.ports.get(target.portId);
      if (!targetBuild || !targetPort || targetPort.direction !== "input") {
        warnings.push({
          severity: "warning",
          message: `Net "${net.id}" target "${key}" is unavailable — dropped.`,
        });
        continue;
      }

      if (targetPort.bits !== sourcePort.bits) {
        warnings.push({
          severity: "warning",
          message: `Net "${net.id}": ${sourcePort.bits}-bit "${net.source.designator}:${net.source.portId}" feeds ${targetPort.bits}-bit "${key}" (bit-width mismatch).`,
        });
      }

      drivenInputs.set(key, net.id);
      wireIndex.registerPort(target.designator, target.portId, sourceSlot);
      targets.push({ designator: target.designator, portId: target.portId });
    }

    resolvedNets.push({
      source: { designator: net.source.designator, portId: net.source.portId },
      targets,
    });
  }

  // --- 3. Compile modules: slots, scratch buffers, and edge lists.

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

  // --- 4. Topologically order the combinational graph.

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
