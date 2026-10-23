/** @format */

import type { PipelineStageConfig } from "../types/architecture";

/** Stable, collision-free stage id from a display name (e.g. "IF" -> "IF"). */
export function makeStageId(name: string, existing: PipelineStageConfig[]): string {
  const base = name.trim().replace(/\s+/g, "_").toUpperCase() || "STAGE";
  if (!existing.some((stage) => stage.id === base)) return base;
  let n = 2;
  while (existing.some((stage) => stage.id === `${base}${n}`)) n++;
  return `${base}${n}`;
}

/** Reordered copy of the stage list after swapping `index` with its neighbor. */
export function moveStage(stages: PipelineStageConfig[], index: number, delta: -1 | 1): PipelineStageConfig[] {
  const target = index + delta;
  if (target < 0 || target >= stages.length) return stages;
  const next = [...stages];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

/** Pipeline-level configuration warnings (pure — no Vue reactivity). */
export function pipelineWarnings(stages: PipelineStageConfig[], startStageBoundary?: string): string[] {
  const warnings: string[] = [];
  const ids = stages.map((stage) => stage.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) warnings.push(`Duplicate stage id: ${[...new Set(duplicates)].join(", ")}.`);
  if (stages.some((stage) => !stage.name.trim())) warnings.push("Every stage needs a name.");
  if (startStageBoundary && !ids.includes(startStageBoundary)) {
    warnings.push(`Start stage boundary "${startStageBoundary}" is not a configured stage.`);
  }
  return warnings;
}
