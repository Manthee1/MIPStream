/** @format */

/**
 * `.data` section parsing: emits a little-endian byte image from
 * `.word` / `.half` / `.byte` directives (multiple comma-separated values per
 * directive are legal) and binds data labels to byte offsets.
 */

import { widthMask } from "@/shared/utils/bit-ops";
import type { DiagnosticCollector } from "@/shared/utils/errors";
import { isXBit } from "@/shared/utils/number";
import { isColonTerminated, matchLabelToken } from "./labels";
import type { SourceLine, Token } from "./tokenize";
import { parseSignedValue } from "./values";

/** Parsed `.data` image (mirrors the legacy output shape). */
export interface DataImage {
    /** Little-endian byte stream. */
    bytes: number[];
    /** Data label → byte offset into `bytes`. */
    labels: Map<string, number>;
}

/** Directive name → emitted byte size. */
const DATA_DIRECTIVE_SIZES: Record<string, number> = {
    ".byte": 1,
    ".half": 2,
    ".word": 4,
};

export function parseDataSection(lines: SourceLine[], diagnostics: DiagnosticCollector): DataImage {
    const bytes: number[] = [];
    const labels = new Map<string, number>();

    for (const line of lines) {
        let index = 0;

        // Optional leading "name:" label binds to the next byte emitted.
        const first = line.tokens[0];
        if (first !== undefined && isColonTerminated(first)) {
            const name = matchLabelToken(first);
            if (name === null) {
                diagnostics.add(
                    "invalid-label",
                    `Invalid data label "${first.text}" — labels must start with a letter or underscore.`,
                    line.line,
                    first.columnStart,
                    first.columnEnd,
                );
            } else if (labels.has(name)) {
                diagnostics.add(
                    "duplicate-label",
                    `Duplicate data label "${name}".`,
                    line.line,
                    first.columnStart,
                    first.columnEnd,
                );
            } else {
                labels.set(name, bytes.length);
            }
            index = 1;
        }

        if (index >= line.tokens.length) continue;

        const directiveToken = line.tokens[index];
        const size = DATA_DIRECTIVE_SIZES[directiveToken.text.toLowerCase()];
        if (size === undefined) {
            diagnostics.add(
                "invalid-directive",
                `Unknown data directive "${directiveToken.text}" (expected .word, .half or .byte).`,
                line.line,
                directiveToken.columnStart,
                directiveToken.columnEnd,
            );
            continue;
        }

        const valueTokens = line.tokens.slice(index + 1);
        if (valueTokens.length === 0) {
            diagnostics.add(
                "invalid-directive",
                `Directive "${directiveToken.text}" expects at least one value.`,
                line.line,
                directiveToken.columnStart,
                directiveToken.columnEnd,
            );
            continue;
        }

        for (const token of valueTokens) {
            emitDataValue(token, size, bytes, diagnostics);
        }
    }

    return { bytes, labels };
}

function emitDataValue(token: Token, size: number, bytes: number[], diagnostics: DiagnosticCollector): void {
    const value = parseSignedValue(token.text);
    if (value === null) {
        diagnostics.add(
            "invalid-value",
            `Invalid data value "${token.text}".`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return;
    }
    const bits = size * 8;
    // Accept any value representable in the entry width (signed or unsigned).
    if (!isXBit(value, bits)) {
        diagnostics.add(
            "immediate-out-of-range",
            `Value ${token.text} does not fit a ${bits}-bit data entry.`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return;
    }
    const masked = value & widthMask(bits);
    for (let i = 0; i < size; i++) {
        bytes.push((masked >>> (i * 8)) & 0xff);
    }
}