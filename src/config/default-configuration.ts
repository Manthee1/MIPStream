/** @format */

import type {
  ArchitectureConfiguration,
  PipelineStageConfig,
} from "../shared/types/architecture";
import { MIPS_ASSEMBLER_CONFIG, cloneAssemblerConfig, normalizeAssemblerConfig } from "./isa-presets";

/** Fresh, empty architecture configuration (also the merge baseline). */
export function createDefaultConfiguration(): ArchitectureConfiguration {
  return {
    pipeline: { enabled: false, stages: [] },
    assembler: { mappings: [] },
    isa: cloneAssemblerConfig(MIPS_ASSEMBLER_CONFIG),
  };
}

/** Classic five-stage preset for quick pipeline setup. */
export function createDefaultPipelineStages(): PipelineStageConfig[] {
  return [
    { id: "IF", name: "Instruction Fetch" },
    { id: "ID", name: "Instruction Decode" },
    { id: "EX", name: "Execute" },
    { id: "MEM", name: "Memory" },
    { id: "WB", name: "Write Back" },
  ];
}

/**
 * Normalizes assembler mappings into the one-to-many shape: one row per
 * editor with a `memoryModuleIds` array. Accepts the current shape as well
 * as the legacy `{ editorId, memoryModuleId }` pair rows, merging multiple
 * legacy rows for the same editor into a single target list.
 */
function normalizeMappings(raw: unknown): ArchitectureConfiguration["assembler"]["mappings"] {
  if (!Array.isArray(raw)) return [];
  const perEditor = new Map<string, string[]>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const editorId = typeof record.editorId === "string" ? record.editorId : null;
    if (!editorId) continue;
    const targets = perEditor.get(editorId) ?? [];
    if (Array.isArray(record.memoryModuleIds)) {
      for (const id of record.memoryModuleIds) {
        if (typeof id === "string" && id && !targets.includes(id)) targets.push(id);
      }
    } else if (typeof record.memoryModuleId === "string" && record.memoryModuleId) {
      if (!targets.includes(record.memoryModuleId)) targets.push(record.memoryModuleId);
    }
    perEditor.set(editorId, targets);
  }
  return [...perEditor.entries()].map(([editorId, memoryModuleIds]) => ({ editorId, memoryModuleIds }));
}

/**
 * Missing-only merge: fills in configuration sections that legacy projects
 * lack without ever overwriting user data, migrating legacy payload shapes.
 */
export function ensureConfiguration(raw: unknown): ArchitectureConfiguration {
  const defaults = createDefaultConfiguration();
  const source = (raw ?? {}) as Partial<ArchitectureConfiguration>;
  return {
    pipeline: source.pipeline ?? defaults.pipeline,
    assembler: source.assembler
      ? { mappings: normalizeMappings((source.assembler as Record<string, unknown>).mappings) }
      : defaults.assembler,
    // Legacy projects stored the old ISADefinition shape; normalize migrates
    // pre-range fields ({ name, bits, type }) into the shared AssemblerConfig.
    isa: source.isa ? normalizeAssemblerConfig(source.isa) : defaults.isa,
    grid: source.grid,
  };
}
