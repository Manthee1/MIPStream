/** @format */

import { defineStore } from "pinia";
import type { AssemblerDiagnostic } from "@/shared/utils/errors";
import type { SimulationStatus } from "@/core/simulation/types";

/** Load-time snapshot of one mapped editor's program (UI-facing bookkeeping). */
export interface LoadedProgramSnapshot {
    /** Instruction index → 1-based source line (the assembler's `pcLineMap`). */
    pcLineMap: number[];
    /** Source lines at load time (index by `line - 1`; LF-normalized). */
    sourceLines: string[];
    /**
     * The program's assembled instruction words, flattened from the entry's
     * imem images in image order (exact for the standard single-imem mapping;
     * region-split programs order by image). Lets the stage visualizer
     * recognize registers that latch the encoded instruction word itself.
     */
    instructionWords: number[];
}

/**
 * Reactive mirror of the simulation session for the UI. The session (and its
 * engine's `Uint32Array` signal buffer) intentionally lives OUTSIDE this
 * store in `useSimulation` — Pinia reactivity must never wrap the hot path.
 */
export const useSimulationStore = defineStore("simulation", {
  state: () => ({
    /**
     * Control state machine status (SIMULATOR_OVERVIEW §4): `unloaded` is
     * the ground state, `finished` is the automatic halt state (the PC ran
     * past the last assembled instruction).
     */
    status: "unloaded" as SimulationStatus,
    /** Completed master clock cycles. */
    cycleCount: 0,
    /** Target clock frequency for continuous run (cycles per second). */
    speed: 8,
    /** Human-readable compile diagnostics from the last engine compilation. */
    compileErrors: [] as string[],
    compileWarnings: [] as string[],
    /** Load-stage errors from the last program load (mapping/capacity). */
    loadErrors: [] as string[],
    /** Typed assembler diagnostics from the last program load (line + column
     *  range — the CodeMirror lint contract; rendered by the Phase 4 UI). */
    assemblerDiagnostics: [] as AssemblerDiagnostic[],
    /**
     * Per-editor snapshot of every successfully loaded program (mapping
     * order — the first entry is the halt-detection convention's primary
     * program). Drives the current-instruction highlight and the stage
     * instruction visualizer; empty when nothing is loaded.
     */
    loadedPrograms: {} as Record<string, LoadedProgramSnapshot>,
    /** Cycle the program finished at, or null — set once per run. */
    haltedAtCycle: null as number | null,
  }),

  actions: {
    setStatus(status: SimulationStatus) {
      this.status = status;
    },

    setCycleCount(count: number) {
      this.cycleCount = count;
    },

    setCompileReport(errors: string[], warnings: string[]) {
      this.compileErrors = errors;
      this.compileWarnings = warnings;
    },

    setLoadReport(loadErrors: string[], assemblerDiagnostics: AssemblerDiagnostic[]) {
      this.loadErrors = loadErrors;
      this.assemblerDiagnostics = assemblerDiagnostics;
    },

    setLoadedPrograms(programs: Record<string, LoadedProgramSnapshot>) {
      this.loadedPrograms = programs;
    },

    setHaltedAtCycle(cycle: number | null) {
      this.haltedAtCycle = cycle;
    },
  },
});

