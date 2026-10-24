/** @format */

import type { SimulationEngine } from "@/core/engine/engine";
import { applyLoadPlan } from "./program-loader";
import type { LoadPlan, LoadReport, SimulationStatus, SimulationTargets } from "./types";

/**
 * The execution control state machine (SIMULATOR_OVERVIEW §4), owning one
 * engine plus the currently loaded program. Framework-free — the Vue adapter
 * (`useSimulation`) drives continuous runs through `advance()` on its own
 * frame loop and mirrors state into Pinia.
 *
 * Halt semantics: after every executed cycle the PC (first `std.pc`) is
 * sampled; when it runs past the last loaded instruction word the session
 * reports `finished` instead of spinning forever. A dedicated `halt`
 * mnemonic (Phase 3) will extend this same controller-layer check, not
 * replace it. Single-cycle semantics — pipeline in-flight draining is a
 * later extension at this seam.
 *
 * Load attribution note: level-sensitive modules (register file, data
 * memory) commit their asserted writes during every propagation pass —
 * including the settle right after loading. The first instruction's
 * side-effects are therefore visible immediately after Load; final states
 * and cycle counts stay exact (one instruction per cycle for a single-cycle
 * datapath).
 */
export class SimulationSession {
    readonly engine: SimulationEngine;
    private readonly targets: SimulationTargets;
    private plan: LoadPlan | null = null;
    private statusValue: SimulationStatus = "unloaded";

    constructor(engine: SimulationEngine, targets: SimulationTargets) {
        this.engine = engine;
        this.targets = targets;
    }

    // ------------------------------------------------------------------ reads

    get status(): SimulationStatus {
        return this.statusValue;
    }

    get cycleCount(): number {
        return this.engine.cycleCount;
    }

    /** True when a program is loaded (paused, running or finished). */
    get hasProgram(): boolean {
        return this.plan !== null;
    }

    /** Scan targets the session was built from (imem/dmem/PC designators). */
    get simulationTargets(): SimulationTargets {
        return this.targets;
    }

    /** Source snapshots of the loaded editors — the restart staleness check. */
    get loadedSources(): Map<string, string> {
        return new Map((this.plan?.entries ?? []).map((entry) => [entry.editorId, entry.source]));
    }

    // --------------------------------------------------------------- controls

    /**
     * Load Program: reset the engine to a fresh state, write the plan's
     * images, settle, and pause at instruction 0. Refuses broken programs
     * (any assembler diagnostic) without touching the loaded session.
     */
    load(plan: LoadPlan): LoadReport {
        if (plan.assemblerDiagnostics.length > 0) {
            return { ok: false, loadErrors: [] };
        }

        this.engine.reset();
        const loadErrors = applyLoadPlan(this.engine, plan, this.targets);
        if (loadErrors.length > 0) {
            // Images failed to land on the freshly reset engine — no program
            // is loaded anymore.
            this.plan = null;
            this.statusValue = "unloaded";
            return { ok: false, loadErrors };
        }

        this.engine.settle();
        this.plan = plan;
        this.statusValue = "paused";
        return { ok: true, loadErrors: [] };
    }

    /**
     * Start Program: resume in place when paused, no-op when already
     * running. Otherwise (unloaded/stopped/finished) the stored plan is
     * re-loaded from scratch and run — the adapter builds a fresh plan and
     * calls `load()` first when the current source should be used.
     */
    start(): boolean {
        if (this.statusValue === "running") return true;
        if (this.statusValue === "paused") {
            this.statusValue = "running";
            return true;
        }
        if (this.plan === null) return false;
        if (!this.load(this.plan).ok) return false;
        this.statusValue = "running";
        return true;
    }

    /** Pause Program: only while running. */
    pause(): boolean {
        if (this.statusValue !== "running") return false;
        this.statusValue = "paused";
        return true;
    }

    /**
     * Stop Program: terminate the session. Registers, memory and the cycle
     * count are preserved for post-mortem inspection; only Load/Start/
     * Restart rebuild state.
     */
    stop(): boolean {
        if (this.statusValue === "unloaded" || this.statusValue === "stopped") return false;
        this.statusValue = "stopped";
        return true;
    }

    /**
     * Next Step: execute exactly one clock cycle while paused. Returns the
     * resulting status ("paused" or "finished"), or null when rejected.
     */
    step(): SimulationStatus | null {
        if (this.statusValue !== "paused") return null;
        this.tick();
        return this.statusValue;
    }

    /**
     * Restart Program: rewind to the *loaded* state — fresh registers and
     * memory, program images re-applied (reset recreates all module state),
     * PC 0, cycle 0, paused at instruction 0. Enabled whenever a program is
     * loaded; a freshly built plan may be passed to replace a stale one (the
     * adapter re-assembles when sources changed).
     */
    restart(freshPlan?: LoadPlan): boolean {
        if (this.plan === null) return false;
        if (this.statusValue === "unloaded" || this.statusValue === "stopped") return false;
        const report = this.load(freshPlan ?? this.plan);
        return report.ok;
    }

    /**
     * Batch execution for the adapter's frame loop: up to `cycles` clock
     * cycles, stopping early when the program halts. Returns the number of
     * cycles actually executed.
     */
    advance(cycles: number): number {
        if (this.statusValue !== "running" || cycles <= 0) return 0;
        let executed = 0;
        while (executed < cycles && this.statusValue === "running") {
            this.tick();
            executed++;
        }
        return executed;
    }

    // ------------------------------------------------------------------ halt

    /** Executes one cycle and runs the halt check. */
    private tick(): void {
        this.engine.step();
        if (this.isHalted()) this.statusValue = "finished";
    }

    /**
     * Halt check: the PC (a byte address on the fixed 32-bit `std.pc`) ran
     * past the last loaded instruction word. A mapping-less plan (no
     * program, e.g. a generic netlist) never halts; an empty `.text` halts
     * on its first cycle.
     */
    private isHalted(): boolean {
        if (this.plan === null || this.plan.entries.length === 0) return false;
        if (this.plan.instructionCount === 0) return true;
        if (this.targets.pcDesignator === null) return false;
        const pc = this.engine.getPortValue(this.targets.pcDesignator, "q");
        if (pc === null) return false;
        return (pc >>> 2) >= this.plan.instructionCount;
    }
}