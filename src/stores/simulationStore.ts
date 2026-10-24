/** @format */

import { defineStore } from "pinia";
import type { AssemblerDiagnostic } from "@/shared/utils/errors";
import type { SimulationStatus } from "@/core/simulation/types";

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

    setHaltedAtCycle(cycle: number | null) {
      this.haltedAtCycle = cycle;
    },
  },
});

