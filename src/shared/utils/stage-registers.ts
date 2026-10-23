/** @format */

import type { PipelineStageConfig } from "../types/architecture";

/** Minimal module shape the reconciler needs (SerializedModule compatible). */
export interface StageRegisterModule {
  designator: string;
  typeId: string;
  config: Record<string, unknown>;
}

/** Reconciliation plan between configured stages and existing managed registers. */
export interface StageRegisterSyncPlan {
  /** Boundary indices that need a new managed register. */
  create: number[];
  /** Designators of managed registers that must be removed. */
  remove: string[];
  /** Designators whose stored stageId label must be refreshed (renames). */
  relabel: { designator: string; stageId: string; stageIndex: number }[];
}

/** Config payload written onto every managed stage boundary register. */
export interface StageRegisterConfigPatch {
  managed: true;
  stageIndex: number;
  stageId: string;
  bitWidth: number;
}

/** Boundary register id for the gap after stage `index` (e.g. "IF/ID"). */
export function boundaryId(stages: PipelineStageConfig[], index: number): string {
  return `${stages[index]?.id ?? "?"}/${stages[index + 1]?.id ?? "?"}`;
}

/** True when a module is a settings-managed stage boundary register. */
export function isStageRegister(module: StageRegisterModule): boolean {
  return module.typeId === "std.register" && module.config?.managed === true;
}

/** Managed stage registers present in the module list, keyed by boundary index. */
function existingByIndex(modules: StageRegisterModule[]): Map<number, StageRegisterModule[]> {
  const byIndex = new Map<number, StageRegisterModule[]>();
  for (const module of modules) {
    if (!isStageRegister(module)) continue;
    const index = Number(module.config.stageIndex);
    if (!Number.isInteger(index)) continue;
    const list = byIndex.get(index) ?? [];
    list.push(module);
    byIndex.set(index, list);
  }
  return byIndex;
}

/**
 * Reconciliation plan between the configured stage list and the managed
 * stage registers on the schematic. Matching happens by boundary **index**
 * (stable under stage renames; the derived `stageId` label is refreshed).
 * Pure — the caller applies the actions through the designer or the store.
 */
export function planStageRegisterSync(
  modules: StageRegisterModule[],
  stages: PipelineStageConfig[]
): StageRegisterSyncPlan {
  const byIndex = existingByIndex(modules);
  const plan: StageRegisterSyncPlan = { create: [], remove: [], relabel: [] };

  for (let index = 0; index + 1 < stages.length; index++) {
    const current = byIndex.get(index) ?? [];
    const keep = current[0];
    // Extra registers mapped to the same boundary are removed.
    for (const extra of current.slice(1)) plan.remove.push(extra.designator);
    if (!keep) {
      plan.create.push(index);
      continue;
    }
    const stageId = boundaryId(stages, index);
    if (keep.config.stageId !== stageId) {
      plan.relabel.push({ designator: keep.designator, stageId, stageIndex: index });
    }
  }

  // Boundaries beyond the (new) stage count disappear with their registers.
  for (const [index, list] of byIndex) {
    if (index + 1 >= stages.length) {
      for (const register of list) plan.remove.push(register.designator);
    }
  }

  return plan;
}

/** Config for a newly created managed register at the given boundary. */
export function stageRegisterConfig(stages: PipelineStageConfig[], index: number): StageRegisterConfigPatch {
  return {
    managed: true,
    stageIndex: index,
    stageId: boundaryId(stages, index),
    bitWidth: 32,
  };
}
