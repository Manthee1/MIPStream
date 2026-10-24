/** @format */

/**
 * Config-driven assembler entry point. Consumes an `AssemblerConfig` (PDL)
 * and assembly source, producing the machine-code image plus every
 * bookkeeping map the simulator needs. Framework-free pure TypeScript — the
 * same dependency rules as `src/core/engine/`.
 *
 * Design notes (handoff contracts for later phases):
 * - `assemble` never throws: all problems are reported as typed diagnostics
 *   (line + column range), the future CodeMirror lint contract.
 * - Failed instruction lines still occupy a word slot so `pcLineMap` and the
 *   label→index map stay aligned; the result is `ok: false` in that case and
 *   must never be loaded into memory.
 * - `label_absolute` resolves labels to **instruction indices** (word
 *   addressing) — the datapath PC must count instructions to match.
 * - `dataMemoryReferences` maps data labels to **byte offsets** in the
 *   little-endian `memory` image — Phase 2's write-back reconciles this with
 *   the word-addressed data memory state.
 */

import type { AssemblerConfig } from "@/shared/types/isa";
import { effectiveTotalBits } from "@/shared/types/isa";
import type { AssemblerDiagnostic } from "@/shared/utils/errors";
import { DiagnosticCollector } from "@/shared/utils/errors";
import { parseDataSection } from "./data-section";
import { encodeFields } from "./encoder";
import { collectTextLabels, skipLabelTokens } from "./labels";
import { resolveOperandValues } from "./operands";
import { splitSections } from "./sections";
import { tokenizeSource } from "./tokenize";

/** Result of `assemble()` — mirrors the legacy output shape. */
export interface AssembleResult {
    /** True when `diagnostics` is empty — the only image safe to load. */
    ok: boolean;
    /** Encoded instruction words (zero-filled for failed lines). */
    instructions: Uint32Array;
    /** Instruction index → 1-based source line (highlighter data source). */
    pcLineMap: number[];
    /** Text labels → instruction index. */
    labels: Map<string, number>;
    /** `.data` image as little-endian bytes. */
    memory: number[];
    /** Data labels → byte offset into `memory`. */
    dataMemoryReferences: Map<string, number>;
    diagnostics: AssemblerDiagnostic[];
}

export function assemble(source: string, config: AssemblerConfig): AssembleResult {
    const diagnostics = new DiagnosticCollector();
    const totalBits = effectiveTotalBits(config);

    // The instruction image is a Uint32Array — wider words are unsupported.
    if (totalBits < 1 || totalBits > 32) {
        diagnostics.add(
            "invalid-config",
            `Instruction word width must be between 1 and 32 bits (got ${totalBits}).`,
            1,
            0,
            0,
        );
        return failed(diagnostics);
    }

    // Index the PDL once: fields, types (for default field values) and
    // mnemonics (matched case-insensitively, MIPS-assembler convention).
    const fields = new Map(config.fields.map((field) => [field.field, field]));
    const types = new Map(config.instruction_types.map((type) => [type.type, type]));
    const mnemonicIndex = new Map(
        config.instruction_set_config.map((instruction) => [instruction.mnemonic.toLowerCase(), instruction]),
    );

    const lines = tokenizeSource(source);
    const sections = splitSections(lines, diagnostics);
    const dataImage = parseDataSection(sections.data, diagnostics);
    const labels = collectTextLabels(sections.text, diagnostics);

    const instructions: number[] = [];
    const pcLineMap: number[] = [];

    for (const line of sections.text) {
        const firstIndex = skipLabelTokens(line);
        if (firstIndex >= line.tokens.length) continue; // label-only line

        const mnemonicToken = line.tokens[firstIndex];
        const instruction = mnemonicIndex.get(mnemonicToken.text.toLowerCase());
        const operandTokens = line.tokens.slice(firstIndex + 1);

        let word = 0;
        if (instruction === undefined) {
            diagnostics.add(
                "unknown-mnemonic",
                `Unknown instruction "${mnemonicToken.text}".`,
                mnemonicToken.line,
                mnemonicToken.columnStart,
                mnemonicToken.columnEnd,
            );
        } else {
            const type = instruction.type !== undefined ? types.get(instruction.type) : undefined;
            const baseValues: Record<string, number> = {
                ...(type?.default_field_values ?? {}),
                ...(instruction.field_values ?? {}),
            };
            const resolved = resolveOperandValues(
                instruction,
                baseValues,
                mnemonicToken,
                operandTokens,
                fields,
                { labels, dataLabels: dataImage.labels, pc: instructions.length },
                diagnostics,
            );
            if (resolved !== null) word = encodeFields(resolved, config.fields, totalBits);
        }

        instructions.push(word);
        pcLineMap.push(line.line);
    }

    return {
        ok: diagnostics.length === 0,
        instructions: new Uint32Array(instructions),
        pcLineMap,
        labels,
        memory: dataImage.bytes,
        dataMemoryReferences: dataImage.labels,
        diagnostics: diagnostics.items,
    };
}

function failed(diagnostics: DiagnosticCollector): AssembleResult {
    return {
        ok: false,
        instructions: new Uint32Array(0),
        pcLineMap: [],
        labels: new Map(),
        memory: [],
        dataMemoryReferences: new Map(),
        diagnostics: diagnostics.items,
    };
}