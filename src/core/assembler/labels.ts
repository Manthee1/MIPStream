/** @format */

/**
 * Label handling for the config-driven assembler: token-level label helpers,
 * the text-section label pre-pass (label → instruction index) and the shared
 * label-prefix skip used by the encoding pass — both passes count
 * instructions with the exact same predicate so they never drift apart.
 */

import type { DiagnosticCollector } from "@/shared/utils/errors";
import type { SourceLine, Token } from "./tokenize";

/** Legal label identifier. */
const LABEL_IDENTIFIER = /^[A-Za-z_]\w*$/;

/** True when the token is colon-terminated (an attempted label prefix). */
export function isColonTerminated(token: Token): boolean {
    return token.text.endsWith(":");
}

/** Returns the label name for a well-formed "name:" token, else null. */
export function matchLabelToken(token: Token): string | null {
    if (!isColonTerminated(token)) return null;
    const name = token.text.slice(0, -1);
    return LABEL_IDENTIFIER.test(name) ? name : null;
}

/**
 * Pre-pass over text-section lines: binds each label to the index of the next
 * instruction so forward references resolve. Any non-empty line after its
 * label prefixes counts as one instruction slot — malformed labels are
 * diagnosed here and still consumed, so they never mask the instruction
 * behind them.
 */
export function collectTextLabels(lines: SourceLine[], diagnostics: DiagnosticCollector): Map<string, number> {
    const labels = new Map<string, number>();
    let instructionCount = 0;

    for (const line of lines) {
        let index = 0;
        while (index < line.tokens.length && isColonTerminated(line.tokens[index])) {
            const token = line.tokens[index];
            const name = matchLabelToken(token);
            if (name === null) {
                diagnostics.add(
                    "invalid-label",
                    `Invalid label "${token.text}" — labels must start with a letter or underscore.`,
                    token.line,
                    token.columnStart,
                    token.columnEnd,
                );
            } else if (labels.has(name)) {
                diagnostics.add(
                    "duplicate-label",
                    `Duplicate label "${name}".`,
                    token.line,
                    token.columnStart,
                    token.columnEnd,
                );
            } else {
                labels.set(name, instructionCount);
            }
            index++;
        }
        if (index < line.tokens.length) instructionCount++;
    }

    return labels;
}

/** Index of the first non-label token on a line (labels already resolved). */
export function skipLabelTokens(line: SourceLine): number {
    let index = 0;
    while (index < line.tokens.length && isColonTerminated(line.tokens[index])) index++;
    return index;
}