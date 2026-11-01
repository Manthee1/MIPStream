/** @format */

import type { AssemblerDiagnostic } from "@/shared/utils/errors";

/**
 * Execution control states (SIMULATOR_OVERVIEW §4). `unloaded` is the
 * session's ground state (nothing loaded / invalidated by an architecture
 * edit); `finished` is the automatic halt state — the PC ran past the last
 * assembled instruction.
 */
export type SimulationStatus = "unloaded" | "paused" | "running" | "stopped" | "finished";

/** Document scan results: the modules a loaded program interacts with. */
export interface SimulationTargets {
    /** Designators of every instruction memory (`std.imem`). */
    instructionMemories: string[];
    /** Designators of every data memory (`std.dmem`). */
    dataMemories: string[];
    /**
     * The first program counter (`std.pc`), or null when the netlist has
     * none — halt detection is then disabled (generic netlists run until
     * Stop).
     */
    pcDesignator: string | null;
    /**
     * Designators of the settings-managed pipeline boundary registers
     * (`std.register` with `managed: true`), in document order. Empty for
     * single-cycle and generic netlists; their presence switches halt
     * handling to pipeline-drain semantics (see `SimulationSession`).
     */
    boundaryRegisters: string[];
}

/** One mapping row's assembled contribution to the machine images. */
export interface LoadPlanEntry {
    editorId: string;
    /** Instruction-memory designator → assembled instruction words. */
    imemImages: Map<string, Uint32Array>;
    /** The editor's `.data` image packed into little-endian words. */
    dataWords: Uint32Array;
    /** Source snapshot at assemble time (the restart staleness check). */
    source: string;
    /**
     * Instruction index → 1-based source line of this editor's program (the
     * assembler's `pcLineMap`). The UI maps the live PC (`pc >>> 2`) through
     * it for the current-instruction highlight and the stage visualizer.
     */
    pcLineMap: number[];
}

/**
 * Everything needed to (re)load a program into a fresh engine state. Kept
 * after loading so Restart can re-apply the images after `engine.reset()`
 * (reset recompiles and recreates every module's state) without
 * re-assembling.
 */
export interface LoadPlan {
    entries: LoadPlanEntry[];
    /** Halt threshold: the longest instruction image, in words. */
    instructionCount: number;
    /**
     * The ISA's `halt` instruction word, encoded by `buildLoadPlan` from the
     * assembler config — the dedicated program terminator. Null when the ISA
     * defines no operand-less `halt`, leaving PC-past-end as the only halt.
     */
    haltWord: number | null;
    /** Every editor's assembler diagnostics — empty when all assembled clean. */
    assemblerDiagnostics: AssemblerDiagnostic[];
}

/** Result of a session `load()` attempt. */
export interface LoadReport {
    ok: boolean;
    /** Load-stage errors (unknown designators, capacity overflow). */
    loadErrors: string[];
}