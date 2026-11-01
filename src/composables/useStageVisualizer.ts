/** @format */

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { getEngine } from '@/composables/useSimulation';
import { getActiveDesigner } from '@/editor/core/designer-bridge';
import { normalizeInstructionText } from '@/shared/utils/instruction-text';
import type { LoadedProgramSnapshot } from '@/stores/simulationStore';
import { useProjectStore } from '@/stores/projectStore';
import { useSimulationStore } from '@/stores/simulationStore';

/** Minimal module shape the sampler needs (SerializedModule-compatible). */
interface ModuleLike {
  designator: string;
  typeId: string;
  config?: Record<string, unknown> | null;
}

/** One stage's slice of the visualizer bar. */
export interface StageInstructionCell {
  stageId: string;
  stageName: string;
  /** Normalized instruction text at this stage, or null (nothing to show). */
  instruction: string | null;
}

/**
 * Stage instruction visualizer (task -4978): derives "which instruction is
 * in which stage" from the architecture's pipeline configuration and the
 * live engine, at display rate.
 *
 * - Stage 0 (fetch) reads the program counter (`std.pc` q output); stage i
 *   reads the managed boundary register with `stageIndex = i - 1` — the
 *   value stage i consumes. `startStageBoundary` marks the first stage that
 *   tracks instruction identity; earlier stages show nothing.
 * - A stage value resolves to a source line by trying, in order: an exact
 *   match against the program's assembled instruction words (registers that
 *   latch the fetched word itself), the byte-addressed PC (`value >>> 2`,
 *   the shipped datapath's convention), then a bare instruction index. A
 *   value that resolves to nothing shows an empty cell — never raw hex.
 * - Instruction text comes from the primary loaded program (mapping order —
 *   the halt-detection convention's first entry), rendered as written in the
 *   editor with light normalization.
 *
 * Pure sampler over the engine's `Uint32Array` — no reactivity in the hot
 * path; reactive cells update only when a value actually changed.
 */
export function useStageVisualizer() {
  const projectStore = useProjectStore();
  const simulationStore = useSimulationStore();

  const cells = ref<StageInstructionCell[]>([]);

  const visible = computed(() => {
    const pipeline = projectStore.currentProject?.architecture?.configuration?.pipeline;
    return pipeline?.enabled === true
      && pipeline.showInstructionBar !== false
      && pipeline.stages.length > 0;
  });

  /** Live designer document when a canvas is mounted, the stored one otherwise. */
  function liveModules(): ModuleLike[] {
    const snapshot = getActiveDesigner()?.getSerializedModules();
    if (snapshot) return snapshot;
    return projectStore.currentProject?.architecture?.modules ?? [];
  }

  function firstDesignator(modules: ModuleLike[], typeId: string): string | null {
    for (const module of modules) {
      if (module.typeId === typeId) return module.designator;
    }
    return null;
  }

  /** The settings-managed boundary register feeding stage `stageIndex + 1`. */
  function boundaryRegister(modules: ModuleLike[], stageIndex: number): ModuleLike | null {
    for (const module of modules) {
      if (module.typeId !== 'std.register') continue;
      const config = module.config ?? {};
      if (config.managed !== true) continue;
      if (Number(config.stageIndex) === stageIndex) return module;
    }
    return null;
  }

  /** Primary loaded program: the first mapping entry (halt-detection order). */
  function primaryProgram(): LoadedProgramSnapshot | null {
    const entries = Object.values(simulationStore.loadedPrograms);
    return entries[0] ?? null;
  }

  /** Maps a raw registered value onto the source line it represents. */
  function resolveCell(raw: number | null, program: LoadedProgramSnapshot | null): string | null {
    if (raw === null || !program) return null;
    const count = program.pcLineMap.length;
    if (count === 0) return null;

    // 1. Exact encoded-instruction-word match — boundary registers that
    //    latch the fetched word (strongest, unambiguous signal).
    const wordHit = wordIndexMap(program).get(raw);
    if (wordHit !== undefined) return lineText(program, wordHit);

    // 2. Byte-addressed PC (the shipped datapath's convention).
    if (raw % 4 === 0) {
      const byteIndex = raw >>> 2;
      if (byteIndex < count) return lineText(program, byteIndex);
    }

    // 3. Bare instruction index (datapaths whose PC counts instructions).
    if (raw < count) return lineText(program, raw);

    // Unresolvable: show nothing — never raw hex.
    return null;
  }

  function lineText(program: LoadedProgramSnapshot, index: number): string | null {
    const line = program.pcLineMap[index];
    const sourceLine = program.sourceLines[line - 1];
    return sourceLine === undefined ? null : normalizeInstructionText(sourceLine);
  }

  /** Encoded word → first instruction index, rebuilt only per program load. */
  let wordIndexCache: { program: LoadedProgramSnapshot | null; map: Map<number, number> } = {
    program: null,
    map: new Map(),
  };

  function wordIndexMap(program: LoadedProgramSnapshot): Map<number, number> {
    if (wordIndexCache.program !== program) {
      const map = new Map<number, number>();
      for (let index = 0; index < program.instructionWords.length; index += 1) {
        const word = program.instructionWords[index];
        if (!map.has(word)) map.set(word, index);
      }
      wordIndexCache = { program, map };
    }
    return wordIndexCache.map;
  }

  function sample(): void {
    const pipeline = projectStore.currentProject?.architecture?.configuration?.pipeline;
    if (!pipeline?.enabled || pipeline.showInstructionBar === false) {
      commit([]);
      return;
    }

    const engine = getEngine();
    const program = primaryProgram();
    const modules = liveModules();
    const pcDesignator = firstDesignator(modules, 'std.pc');

    // Stages before the start boundary perform pre-fetch work — no identity.
    let startIndex = 0;
    if (pipeline.startStageBoundary) {
      const found = pipeline.stages.findIndex((stage) => stage.id === pipeline.startStageBoundary);
      if (found >= 0) startIndex = found;
    }

    const next: StageInstructionCell[] = pipeline.stages.map((stage, index) => {
      if (index < startIndex) {
        return { stageId: stage.id, stageName: stage.name, instruction: null };
      }
      const designator =
        index === 0 ? pcDesignator : boundaryRegister(modules, index - 1)?.designator ?? null;
      const raw = designator && engine ? engine.getPortValue(designator, 'q') : null;
      return { stageId: stage.id, stageName: stage.name, instruction: resolveCell(raw, program) };
    });

    commit(next);
  }

  /** Dirty-check commit — reactive writes only when something changed. */
  function commit(next: StageInstructionCell[]): void {
    const current = cells.value;
    if (
      current.length === next.length
      && current.every(
        (cell, index) =>
          cell.stageId === next[index].stageId
          && cell.instruction === next[index].instruction,
      )
    ) {
      return;
    }
    cells.value = next;
  }

  // Display-rate sampling loop (the SchematicViewer pattern) — cheap no-op
  // while hidden, dirty-checked while visible.
  let frameRequestId: number | null = null;

  function loop(): void {
    frameRequestId = null;
    if (visible.value) sample();
    frameRequestId = requestAnimationFrame(loop);
  }

  onMounted(() => {
    frameRequestId = requestAnimationFrame(loop);
  });

  onBeforeUnmount(() => {
    if (frameRequestId !== null) cancelAnimationFrame(frameRequestId);
    frameRequestId = null;
  });

  return { visible, cells };
}

