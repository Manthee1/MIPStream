/** @format */

import { getManifest } from "@/shared/manifestRegistry";
import type {
  ModuleEvaluators,
  PortDefinition,
  SerializedModule,
} from "@/shared/types/manifest";
import type { SerializedNet } from "@/shared/types/netlist";
import type { CompileIssue } from "../types";
import { portKey } from "./wire-index";

/** Serialized document shape the resolver, compiler, and lint accept. */
export interface ArchitectureDocument {
  modules?: SerializedModule[];
  nets?: SerializedNet[];
}

/** A module resolved against its manifest, ready for wire-slot binding. */
export interface ModuleBuild {
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
export interface NetEndpointRef {
  designator: string;
  portId: string;
}

/** A net resolved to its id, its source port, and its surviving target inputs. */
export interface ResolvedNet {
  netId: string;
  source: NetEndpointRef;
  targets: NetEndpointRef[];
}

export interface ResolvedArchitecture {
  builds: Map<string, ModuleBuild>;
  resolvedNets: ResolvedNet[];
  /** Driven input port keys ("u2:d") → the net id driving each. */
  drivenInputs: Map<string, string>;
  /** Output port keys currently sourcing at least one net. */
  sourcedOutputs: Set<string>;
  errors: CompileIssue[];
  warnings: CompileIssue[];
}

/**
 * Resolves a serialized architecture against the manifest registry and
 * validates its netlist (the resolver half of ENGINE_SPEC §2). Shared by the
 * compiler (which continues with wire-slot binding and evaluation ordering)
 * and the designer's lint pass — one validation source, two consumers.
 */
export function resolveArchitecture(
  document: ArchitectureDocument
): ResolvedArchitecture {
  const errors: CompileIssue[] = [];
  const warnings: CompileIssue[] = [];

  // --- 1. Resolve modules against the manifest registry.

  const builds = new Map<string, ModuleBuild>();
  for (const serialized of document.modules ?? []) {
    if (builds.has(serialized.designator)) {
      errors.push({
        severity: "error",
        message: `Duplicate module designator "${serialized.designator}" — keeping the first instance.`,
        refs: [serialized.designator],
      });
      continue;
    }

    const manifest = getManifest(serialized.typeId);
    if (!manifest) {
      errors.push({
        severity: "error",
        message: `Module "${serialized.designator}" references unknown type "${serialized.typeId}".`,
        refs: [serialized.designator],
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

  // --- 2. Resolve nets and validate the netlist.

  const seenNetIds = new Set<string>();
  const drivenInputs = new Map<string, string>();
  const sourcedOutputs = new Set<string>();
  const resolvedNets: ResolvedNet[] = [];

  for (const net of document.nets ?? []) {
    if (seenNetIds.has(net.id)) {
      errors.push({
        severity: "error",
        message: `Duplicate net id "${net.id}" — keeping the first net.`,
        refs: [net.id],
      });
      continue;
    }
    seenNetIds.add(net.id);

    const sourceBuild = builds.get(net.source.designator);
    const sourcePort = sourceBuild?.ports.get(net.source.portId);
    const sourceRef = portKey(net.source.designator, net.source.portId);
    if (!sourceBuild || !sourcePort || sourcePort.direction !== "output") {
      errors.push({
        severity: "error",
        message: `Net "${net.id}" has no valid source port — skipped.`,
        refs: [net.id, sourceRef],
      });
      continue;
    }

    sourcedOutputs.add(sourceRef);

    const targets: NetEndpointRef[] = [];
    for (const target of net.targets ?? []) {
      const targetRef = portKey(target.designator, target.portId);
      if (drivenInputs.has(targetRef)) {
        errors.push({
          severity: "error",
          message: `Input "${targetRef}" is driven by nets "${drivenInputs.get(targetRef)}" and "${net.id}" — keeping the first driver.`,
          refs: [targetRef, net.id],
        });
        continue;
      }

      const targetBuild = builds.get(target.designator);
      const targetPort = targetBuild?.ports.get(target.portId);
      if (!targetBuild || !targetPort || targetPort.direction !== "input") {
        warnings.push({
          severity: "warning",
          message: `Net "${net.id}" target "${targetRef}" is unavailable — dropped.`,
          refs: [net.id, targetRef],
        });
        continue;
      }

      if (targetPort.bits !== sourcePort.bits) {
        warnings.push({
          severity: "warning",
          message: `Net "${net.id}": ${sourcePort.bits}-bit "${sourceRef}" feeds ${targetPort.bits}-bit "${targetRef}" (bit-width mismatch).`,
          refs: [net.id, sourceRef, targetRef],
        });
      }

      drivenInputs.set(targetRef, net.id);
      targets.push({ designator: target.designator, portId: target.portId });
    }

    resolvedNets.push({
      netId: net.id,
      source: { designator: net.source.designator, portId: net.source.portId },
      targets,
    });
  }

  return { builds, resolvedNets, drivenInputs, sourcedOutputs, errors, warnings };
}
