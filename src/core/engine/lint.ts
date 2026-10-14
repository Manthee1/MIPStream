/** @format */

import { resolveArchitecture, type ArchitectureDocument } from "./compile/resolver";
import { portKey } from "./compile/wire-index";
import { topologicalSort, type TopoEdge } from "./compile/topological-sort";

/**
 * A designer-facing diagnostic with element locators for click-to-focus:
 * `"u2"` a module designator, `"n3"` a net id, `"u2:out"` a module port.
 */
export interface LintIssue {
  severity: "error" | "warning" | "info";
  message: string;
  refs?: string[];
}

/**
 * Lints a serialized architecture for the designer's Problems panel.
 *
 * Reuses the engine's resolver (single validation source: netlist errors,
 * width mismatches, duplicate drivers, unavailable endpoints) and adds the
 * combinational-loop check plus designer-level connectivity info (undriven
 * inputs, unconnected outputs, nets driving nothing).
 */
export function lintArchitecture(document: ArchitectureDocument): LintIssue[] {
  const { builds, resolvedNets, drivenInputs, sourcedOutputs, errors, warnings } =
    resolveArchitecture(document);

  const issues: LintIssue[] = [...errors, ...warnings];

  // Unbuffered combinational loop — the same rule the compiler enforces.
  const combinationalIds = new Set<string>();
  for (const build of builds.values()) {
    if (build.evaluators.clockEdge === undefined) combinationalIds.add(build.designator);
  }

  const edges: TopoEdge[] = [];
  for (const net of resolvedNets) {
    if (!combinationalIds.has(net.source.designator)) continue;
    for (const target of net.targets) {
      if (combinationalIds.has(target.designator)) {
        edges.push({ from: net.source.designator, to: target.designator });
      }
    }
  }

  const { cyclic } = topologicalSort([...combinationalIds], edges);
  if (cyclic.length > 0) {
    issues.push({
      severity: "error",
      message: `Unbuffered combinational loop through: ${cyclic.join(", ")}. Insert a stage register to break the cycle.`,
      refs: cyclic,
    });
  }

  // Connectivity info — normal while designing, surfaced for completeness.
  for (const build of builds.values()) {
    for (const [portId, port] of build.ports) {
      const ref = portKey(build.designator, portId);
      if (port.direction === "input" && !drivenInputs.has(ref)) {
        issues.push({
          severity: "info",
          message: `Input ${ref} is not connected (reads 0).`,
          refs: [ref],
        });
      }
      if (port.direction === "output" && !sourcedOutputs.has(ref)) {
        issues.push({
          severity: "info",
          message: `Output ${ref} is not connected.`,
          refs: [ref],
        });
      }
    }
  }

  for (const net of resolvedNets) {
    if (net.targets.length === 0) {
      issues.push({
        severity: "info",
        message: `Net "${net.netId}" drives no inputs.`,
        refs: [net.netId],
      });
    }
  }

  return issues;
}
