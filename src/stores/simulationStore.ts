/** @format */

import { defineStore } from "pinia";

/** Execution control state (SIMULATOR_OVERVIEW §4 control state machine). */
export type SimulationStatus = "stopped" | "running" | "paused";

/**
 * Reactive mirror of the simulation session for the UI. The engine itself
 * (and its `Uint32Array` signal buffer) intentionally lives OUTSIDE this
 * store in `useSimulation` — Pinia reactivity must never wrap the hot path.
 */
export const useSimulationStore = defineStore("simulation", {
  state: () => ({
    status: "stopped" as SimulationStatus,
    /** Completed master clock cycles. */
    cycleCount: 0,
    /** Target clock frequency for continuous run (cycles per second). */
    speed: 8,
    /** Human-readable compile diagnostics from the last compilation. */
    compileErrors: [] as string[],
    compileWarnings: [] as string[],
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
  },
});

