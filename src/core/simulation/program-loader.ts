/** @format */

import { assemble } from "@/core/assembler";
import type { ArchitectureDocument } from "@/core/engine/compile/compiler";
import type { SimulationEngine } from "@/core/engine/engine";
import type { WordMemoryState } from "@/shared/manifests/word-memory";
import type { ArchitectureConfiguration } from "@/shared/types/architecture";
import type { ProjectEditor } from "@/shared/types/project";
import type { AssemblerDiagnostic } from "@/shared/utils/errors";
import type { LoadPlan, LoadPlanEntry, SimulationTargets } from "./types";

/**
 * Program loading — the "Load Program" row of the SIMULATOR_OVERVIEW §4
 * control table and the bridge between the Phase 1 assembler and the
 * engine's memory state. Framework-free: `buildLoadPlan` is pure,
 * `applyLoadPlan` talks to the engine exclusively through the
 * `mutateModuleState` write-back seam.
 */

/** typeId conventions the loader relies on (see the shared manifests). */
const INSTRUCTION_MEMORY_TYPE = "std.imem";
const DATA_MEMORY_TYPE = "std.dmem";
const PROGRAM_COUNTER_TYPE = "std.pc";

/**
 * Scans a document for the modules a loaded program interacts with. The PC
 * is identified purely by its fixed `std.pc` typeId (see the manifest); when
 * the netlist has none, halt detection is disabled — generic netlists run
 * until the user stops them.
 */
export function scanSimulationTargets(document: ArchitectureDocument): SimulationTargets {
    const instructionMemories: string[] = [];
    const dataMemories: string[] = [];
    let pcDesignator: string | null = null;

    for (const module of document.modules ?? []) {
        if (module.typeId === INSTRUCTION_MEMORY_TYPE) {
            instructionMemories.push(module.designator);
        } else if (module.typeId === DATA_MEMORY_TYPE) {
            dataMemories.push(module.designator);
        } else if (module.typeId === PROGRAM_COUNTER_TYPE && pcDesignator === null) {
            pcDesignator = module.designator;
        }
    }

    return { instructionMemories, dataMemories, pcDesignator };
}

/** Input bundle for `buildLoadPlan`. */
export interface LoadPlanInput {
    configuration: ArchitectureConfiguration;
    editors: ProjectEditor[];
    targets: SimulationTargets;
}

/** `buildLoadPlan` result: the plan plus load-stage errors. */
export interface BuiltPlan {
    plan: LoadPlan;
    /** Load-stage errors (unknown editor / unknown memory designator). */
    loadErrors: string[];
}

/**
 * Assembles every mapped editor into machine images. Mapping rows are
 * processed in configuration order; a later row targeting the same memory
 * overwrites the earlier one (the assembler settings UI warns about this).
 * Every mapped editor's `.data` image is written to the shared data
 * memories — a documented convention until an explicit data-memory mapping
 * exists (the overview spec maps editors to instruction memories only).
 *
 * Assembler diagnostics are collected on the plan rather than treated as
 * errors here — the session refuses to load a plan that carries any.
 */
export function buildLoadPlan({ configuration, editors, targets }: LoadPlanInput): BuiltPlan {
    const entries: LoadPlanEntry[] = [];
    const loadErrors: string[] = [];
    const assemblerDiagnostics: AssemblerDiagnostic[] = [];
    let instructionCount = 0;

    for (const mapping of configuration.assembler.mappings) {
        const editor = editors.find((candidate) => candidate.id === mapping.editorId);
        if (editor === undefined) {
            loadErrors.push(`Assembler mapping references unknown editor "${mapping.editorId}".`);
            continue;
        }

        const result = assemble(editor.sourceCode, configuration.isa);
        assemblerDiagnostics.push(...result.diagnostics);

        const imemImages = new Map<string, Uint32Array>();
        for (const designator of mapping.memoryModuleIds) {
            if (!targets.instructionMemories.includes(designator)) {
                loadErrors.push(
                    `Assembler mapping for editor "${editor.id}" targets unknown instruction memory "${designator}".`,
                );
                continue;
            }
            imemImages.set(designator, result.instructions);
            instructionCount = Math.max(instructionCount, result.instructions.length);
        }

        entries.push({
            editorId: editor.id,
            imemImages,
            dataWords: packBytesToWords(result.memory),
            source: editor.sourceCode,
        });
    }

    return { plan: { entries, instructionCount, assemblerDiagnostics }, loadErrors };
}

/**
 * Packs a little-endian byte image (the assembler's `.data` output) into
 * 32-bit words: word 0 = bytes 0-3, so byte offset 4 lands in word 1 — the
 * same addressing the dmem port uses (`addr >>> 2`).
 */
export function packBytesToWords(bytes: number[]): Uint32Array {
    const words = new Uint32Array(Math.ceil(bytes.length / 4));
    for (let i = 0; i < bytes.length; i++) {
        words[i >>> 2] |= (bytes[i] & 0xff) << ((i & 3) * 8);
    }
    return words;
}

/**
 * Writes a plan's images into a freshly reset engine's imem/dmem state via
 * the engine write-back seam, validating capacity (never truncating
 * silently). The caller settles the engine afterwards (the session does).
 * Returns the load-stage errors; an empty list means every image landed.
 */
export function applyLoadPlan(engine: SimulationEngine, plan: LoadPlan, targets: SimulationTargets): string[] {
    const loadErrors: string[] = [];

    for (const entry of plan.entries) {
        for (const [designator, image] of entry.imemImages) {
            writeImage(engine, designator, image, `instruction memory "${designator}"`, loadErrors);
        }
        for (const designator of targets.dataMemories) {
            writeImage(engine, designator, entry.dataWords, `data memory "${designator}"`, loadErrors);
        }
    }

    return loadErrors;
}

function writeImage(
    engine: SimulationEngine,
    designator: string,
    image: Uint32Array,
    label: string,
    loadErrors: string[],
): void {
    if (image.length === 0) return;

    const state = engine.getModuleState(designator) as WordMemoryState | undefined;
    if (state === undefined) {
        loadErrors.push(`${label} has no engine-owned memory state.`);
        return;
    }
    if (image.length > state.words.length) {
        loadErrors.push(
            `Program image (${image.length} words) exceeds ${label} capacity (${state.words.length} words).`,
        );
        return;
    }

    engine.mutateModuleState<WordMemoryState>(designator, (memory) => {
        memory.words.set(image);
    });
}