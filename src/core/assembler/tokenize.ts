/** @format */

/**
 * Source tokenization for the config-driven assembler. Produces column-aware
 * tokens so every downstream diagnostic can point at the exact offending text
 * (the CodeMirror lint contract).
 */

/** A single source token with its 0-based column span (end exclusive). */
export interface Token {
    text: string;
    /** 1-based source line. */
    line: number;
    /** 0-based inclusive start column. */
    columnStart: number;
    /** 0-based exclusive end column. */
    columnEnd: number;
}

/** One tokenized source line with its comment-stripped content. */
export interface SourceLine {
    /** 1-based line number in the original source. */
    line: number;
    /** Comment-stripped raw text (kept untrimmed so columns stay exact). */
    content: string;
    tokens: Token[];
}

/** Assembly comment introducers (`;` legacy style, `#` MIPS style). */
const COMMENT_PATTERN = /[;#]/;

function isSeparator(char: string): boolean {
    return char === " " || char === "\t" || char === "," || char === "\r";
}

/** Strips a `;` or `#` comment (assembly source has no string literals). */
export function stripComment(raw: string): string {
    const match = COMMENT_PATTERN.exec(raw);
    return match === null ? raw : raw.slice(0, match.index);
}

function tokenizeLine(raw: string, line: number): SourceLine {
    const content = stripComment(raw);
    const tokens: Token[] = [];
    let index = 0;
    while (index < content.length) {
        while (index < content.length && isSeparator(content[index])) index++;
        if (index >= content.length) break;
        const start = index;
        while (index < content.length && !isSeparator(content[index])) index++;
        tokens.push({ text: content.slice(start, index), line, columnStart: start, columnEnd: index });
    }
    return { line, content, tokens };
}

/** Tokenizes full source; line numbers stay absolute (1-based). */
export function tokenizeSource(source: string): SourceLine[] {
    return source
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((raw, index) => tokenizeLine(raw, index + 1));
}