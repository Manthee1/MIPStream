/** @format */

/**
 * `.data` / `.text` section splitting for the config-driven assembler.
 * Sections may appear in any order and repeat — content belongs to the
 * section active at its line, and lines before any directive default to
 * `.text`. Section directives must stand alone on their line.
 */

import type { DiagnosticCollector } from "@/shared/utils/errors";
import type { SourceLine } from "./tokenize";

export interface SectionedProgram {
    data: SourceLine[];
    text: SourceLine[];
}

const SECTION_DIRECTIVES = new Set([".data", ".text"]);

export function splitSections(lines: SourceLine[], diagnostics: DiagnosticCollector): SectionedProgram {
    const data: SourceLine[] = [];
    const text: SourceLine[] = [];
    let current: "data" | "text" = "text";

    for (const line of lines) {
        const first = line.tokens[0];
        if (first !== undefined && SECTION_DIRECTIVES.has(first.text.toLowerCase())) {
            if (line.tokens.length > 1) {
                diagnostics.add(
                    "invalid-section",
                    `Section directive "${first.text}" must stand alone on its line.`,
                    line.line,
                    first.columnStart,
                    line.tokens[1].columnStart,
                );
            }
            current = first.text.toLowerCase() === ".data" ? "data" : "text";
            continue;
        }
        (current === "data" ? data : text).push(line);
    }

    return { data, text };
}