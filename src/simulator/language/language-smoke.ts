/** @format */

/**
 * Standalone assembly-language support self-check: parser token styles, lint
 * diagnostic mapping, label scanning and the current-instruction highlight
 * field. Runs against the real MIPS preset with no UI dependencies.
 * Execute via `npm run language:check`.
 */

import { StringStream } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { MIPS_ASSEMBLER_CONFIG } from "@/config/isa-presets";
import { assemble } from "@/core/assembler";
import { buildAssemblyParser } from "./assembly-parser";
import { findLabelDefinitions } from "./assembly-navigation";
import { toCodeMirrorDiagnostic } from "./assembly-lint";
import { currentInstructionField, setCurrentInstructionLine } from "./instruction-highlight";

/** Node process API — only the SSR-built smoke bundle actually executes it. */
declare const process: { exit(code?: number): void };

let failures = 0;

function report(pass: boolean, label: string, detail: string): void {
    if (!pass) failures++;
    console.log(`${pass ? "PASS" : "FAIL"}  ${label}${pass ? "" : `  ${detail}`}`);
}

function check(label: string, actual: unknown, expected: unknown): void {
    report(actual === expected, label, `(got ${String(actual)}, want ${String(expected)})`);
}

// ------------------------------------------------------------------ parser

const parser = buildAssemblyParser(MIPS_ASSEMBLER_CONFIG);

interface StyleToken {
    text: string;
    style: string;
}

/** Tokenizes one line through the stream parser (fresh per-line state). */
function tokenize(line: string): StyleToken[] {
    const stream = new StringStream(line, 4, 2);
    const state = parser.startState!(2);
    const tokens: StyleToken[] = [];
    while (!stream.eol()) {
        const from = stream.pos;
        const style = parser.token!(stream, state);
        if (stream.pos === from) stream.next(); // no-progress guard
        if (style !== null && stream.pos > from) {
            tokens.push({ text: line.slice(from, stream.pos), style });
        }
    }
    return tokens;
}

function checkTokens(label: string, line: string, expected: [string, string][]): void {
    const actual = tokenize(line).map((token) => [token.text, token.style] as [string, string]);
    const matches =
        actual.length === expected.length
        && actual.every(
            (token, index) => token[0] === expected[index][0] && token[1] === expected[index][1],
        );
    report(
        matches,
        `parser: ${label}`,
        `(got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`,
    );
}

checkTokens("mnemonic + register + label ref", "lw   $t0, value", [
    ["lw", "mnemonic"],
    ["$t0", "register"],
    [",", "punctuation"],
    ["value", "label"],
]);

checkTokens("label def + mnemonic on one line", "main: add $t1, $t1, $t0", [
    ["main:", "label"],
    ["add", "mnemonic"],
    ["$t1", "register"],
    [",", "punctuation"],
    ["$t1", "register"],
    [",", "punctuation"],
    ["$t0", "register"],
]);

checkTokens("data directive line", "value:  .word 7", [
    ["value:", "label"],
    [".word", "directive"],
    ["7", "number"],
]);

checkTokens("comment only", "# trailing note", [["# trailing note", "comment"]]);

checkTokens("semicolon comment + memory operand", "lw $t0, 4($t1) ; load", [
    ["lw", "mnemonic"],
    ["$t0", "register"],
    [",", "punctuation"],
    ["4", "number"],
    ["(", "punctuation"],
    ["$t1", "register"],
    [")", "punctuation"],
    ["; load", "comment"],
]);

checkTokens("unknown first word is not a mnemonic", "foo bar", [
    ["foo", "label"],
    ["bar", "label"],
]);

checkTokens("section directive", ".data", [[".data", "directive"]]);


// ------------------------------------------------------------------ labels

const PROGRAM = [
    ".data",
    "value:  .word 7",
    "result: .word 0",
    "",
    ".text",
    "main:",
    "    lw   $t0, value",
    "loop:",
    "    beq  $t0, $zero, done # exit",
    "done:",
    "    halt",
].join("\n");

const labels = findLabelDefinitions(PROGRAM);
check("labels: value → line 2", labels.get("value"), 2);
check("labels: result → line 3", labels.get("result"), 3);
check("labels: main → line 6", labels.get("main"), 6);
check("labels: loop → line 8", labels.get("loop"), 8);
check("labels: done → line 10", labels.get("done"), 10);
check(
    "labels: commented-out label is not a definition",
    findLabelDefinitions("add $t0, $t1, x # done:").has("done"),
    false,
);
check("labels: CRLF safe", findLabelDefinitions("main:\r\n    halt\r\n").get("main"), 1);
check(
    "labels: same-line label + instruction",
    findLabelDefinitions("loop: beq $t0, $zero, done").get("loop"),
    1,
);

// ------------------------------------------------------- lint diagnostic map

const badSource = "frob $t0\nadd $t1, $t1";
const bad = assemble(badSource, MIPS_ASSEMBLER_CONFIG);
check("assemble: bad source carries diagnostics", bad.diagnostics.length > 0, true);

const lintState = EditorState.create({ doc: badSource });
const mapped = bad.diagnostics.map((diag) => toCodeMirrorDiagnostic(lintState.doc, diag));
check("lint: first diagnostic maps to line 1", lintState.doc.lineAt(mapped[0].from).number, 1);
check(
    "lint: range covers the offending token",
    lintState.sliceDoc(mapped[0].from, mapped[0].to),
    "frob",
);
check("lint: later diagnostic maps to line 2", lintState.doc.lineAt(mapped[1].from).number, 2);
check(
    "lint: out-of-range line clamps to the last line",
    lintState.doc.lineAt(
        toCodeMirrorDiagnostic(lintState.doc, {
            code: "unknown-mnemonic",
            message: "x",
            line: 99,
            columnStart: 0,
            columnEnd: 3,
        }).from,
    ).number,
    2,
);

// -------------------------------------------- current-instruction highlight

const field = currentInstructionField;
let highlightState = EditorState.create({ doc: PROGRAM, extensions: [field] });
check("highlight: starts empty", highlightState.field(field).size, 0);

highlightState = highlightState.update({ effects: setCurrentInstructionLine.of(7) }).state;
check("highlight: marks exactly one line", highlightState.field(field).size, 1);
check(
    "highlight: marks the requested line",
    highlightState.field(field).iter().from,
    highlightState.doc.line(7).from,
);

// Typing above the highlighted instruction keeps the highlight on the same
// source line (the decoration maps through document changes).
highlightState = highlightState.update({ changes: { from: 0, insert: "; header\n" } }).state;
check(
    "highlight: survives edits above",
    highlightState.field(field).iter().from,
    highlightState.doc.line(8).from,
);

highlightState = highlightState.update({ effects: setCurrentInstructionLine.of(null) }).state;
check("highlight: null clears", highlightState.field(field).size, 0);

// --------------------------------------------------------------------- exit

if (failures > 0) {
    console.log(`\n${failures} language check(s) FAILED`);
    process.exit(1);
}
console.log("\nAll language checks passed.");
