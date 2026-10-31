/** @format */

/**
 * Standalone assembler self-check — golden encodes against real MIPS32
 * semantics plus one case per diagnostic class. Runs through the public
 * `assemble(source, config)` API with the real MIPS preset (no UI
 * dependencies). Execute via `npm run assembler:check`.
 */

import { MIPS_ASSEMBLER_CONFIG } from "@/config/isa-presets";
import type { AssemblerConfig } from "@/shared/types/isa";
import type { AssemblerDiagnostic, DiagnosticCode } from "@/shared/utils/errors";
import { assemble } from "./index";

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

function checkHex(label: string, actual: number, expected: number): void {
    report(
        actual === expected,
        label,
        `(got 0x${(actual >>> 0).toString(16)}, want 0x${expected.toString(16)})`,
    );
}

/** Assembles expecting zero diagnostics; returns the result. */
function assembleOk(source: string, config: AssemblerConfig = MIPS_ASSEMBLER_CONFIG) {
    const result = assemble(source, config);
    report(
        result.diagnostics.length === 0,
        `clean assembly: ${source.trim().split("\n")[0].slice(0, 40)}`,
        `diagnostics: ${result.diagnostics.map((d) => `${d.code}@${d.line}`).join(", ")}`,
    );
    return result;
}

/**
 * Assembles expecting exactly one diagnostic of `code` (and `ok === false`);
 * returns the diagnostic.
 */
function checkDiagnostic(
    code: DiagnosticCode,
    source: string,
    config: AssemblerConfig = MIPS_ASSEMBLER_CONFIG,
): AssemblerDiagnostic | undefined {
    const result = assemble(source, config);
    const matching = result.diagnostics.filter((diagnostic) => diagnostic.code === code);
    report(
        !result.ok && matching.length === 1,
        `diagnostic: ${code}`,
        `ok=${result.ok}, codes=[${result.diagnostics.map((d) => d.code).join(", ")}]`,
    );
    return matching[0];
}

// ------------------------------------------------------------- golden encodes

// R-type: add $t0, $s1, $s2 — the classic Patterson & Hennessy word.
{
    const result = assembleOk(".text\nadd $t0, $s1, $s2\n");
    checkHex("add $t0, $s1, $s2 → 0x02324020", result.instructions[0], 0x02324020);
}

// Mnemonics are case-insensitive.
{
    const result = assembleOk(".text\nADD $t0, $s1, $s2\n");
    checkHex("ADD (upper case) → same word", result.instructions[0], 0x02324020);
}

// Register alias forms: $8 == $t0, R17 == $s1.
{
    const result = assembleOk(".text\nadd $8, R17, $s2\n");
    checkHex("add $8, R17, $s2 → alias forms resolve", result.instructions[0], 0x02324020);
}

// I-type immediates: positive, negative (two's complement), unsigned edge.
{
    const result = assembleOk(".text\naddi $t0, $t1, 5\naddi $t0, $t1, -1\naddi $t0, $t1, 65535\n");
    checkHex("addi $t0, $t1, 5 → 0x21280005", result.instructions[0], 0x21280005);
    checkHex("addi $t0, $t1, -1 → 0x2128ffff", result.instructions[1], 0x2128ffff);
    checkHex("addi $t0, $t1, 65535 (unsigned edge) → 0x2128ffff", result.instructions[2], 0x2128ffff);
}

// R-type: slt (funct 0x2a) — set-less-than.
{
    const result = assembleOk(".text\nslt $t0, $t1, $t2\n");
    checkHex("slt $t0, $t1, $t2 → 0x012a402a", result.instructions[0], 0x012a402a);
}

// J-type halt: a single opcode word — the controller-layer terminator.
{
    const result = assembleOk(".text\nhalt\n");
    checkHex("halt → 0xfc000000", result.instructions[0], 0xfc000000);
}

// Memory operands: lw/sw effective addresses.
{
    const result = assembleOk(".text\nlw $t0, 4($sp)\nsw $s1, 8($sp)\n");
    checkHex("lw $t0, 4($sp) → 0x8fa80004", result.instructions[0], 0x8fa80004);
    checkHex("sw $s1, 8($sp) → 0xafb10008", result.instructions[1], 0xafb10008);
}

// Branches: forward and backward label offsets + bookkeeping maps.
{
    const result = assembleOk(".text\nstart:\n  beq $t0, $t1, end\n  nop\nend:\n  nop\n");
    checkHex("beq forward (offset 1) → 0x11090001", result.instructions[0], 0x11090001);
    checkHex("nop (zero operands) → 0x00000000", result.instructions[1], 0x00000000);
    check("pcLineMap tracks absolute source lines", result.pcLineMap.join(","), "3,4,6");
    check("labels map start → 0", result.labels.get("start"), 0);
    check("labels map end → 2", result.labels.get("end"), 2);
}
{
    const result = assembleOk(".text\nloop:\n  nop\n  beq $t0, $t1, loop\n");
    checkHex("beq backward (offset -2) → 0x1109fffe", result.instructions[1], 0x1109fffe);
}

// Label on the same line as its instruction.
{
    const result = assembleOk(".text\nmain: nop\nbeq $t0, $t1, main\n");
    check("same-line label binds to its instruction", result.labels.get("main"), 0);
    checkHex("branch to same-line label → 0x1109fffe", result.instructions[1], 0x1109fffe);
}

// .data layout: little-endian byte image + label → byte-offset map.
{
    const result = assembleOk(
        ".data\nx: .word 0x12345678\ny: .half 0x1234\nz: .byte 255, 1\nw: .word -1\n.text\nnop\n",
    );
    check(
        ".data byte image (LE, multi-value directives)",
        result.memory.join(","),
        "120,86,52,18,52,18,255,1,255,255,255,255",
    );
    check("data label x → byte 0", result.dataMemoryReferences.get("x"), 0);
    check("data label y → byte 4", result.dataMemoryReferences.get("y"), 4);
    check("data label z → byte 6", result.dataMemoryReferences.get("z"), 6);
    check("data label w → byte 8", result.dataMemoryReferences.get("w"), 8);
}

// Bare data label as a memory operand (base register keeps its default).
{
    const result = assembleOk(".data\na: .word 7\nx: .word 9\n.text\nlw $t0, x\n");
    checkHex("lw $t0, x (bare data label, offset 4) → 0x8c080004", result.instructions[0], 0x8c080004);
}

// Empty / data-only programs assemble clean.
{
    const empty = assemble("", MIPS_ASSEMBLER_CONFIG);
    check("empty source: ok", empty.ok, true);
    check("empty source: no instructions", empty.instructions.length, 0);
    const dataOnly = assemble(".data\nx: .word 1\n", MIPS_ASSEMBLER_CONFIG);
    check("data-only source: ok", dataOnly.ok, true);
    check("data-only source: byte image", dataOnly.memory.join(","), "1,0,0,0");
}

// --------------------------------------------------- synthetic ISA constructs

const SYNTHETIC_ISA: AssemblerConfig = {
    format_name: "Synthetic",
    total_bits: 32,
    fields: [
        { field: "opcode", label: "Opcode", def_type: "raw_value", bits: 6, ranges: [[26, 31]] },
        { field: "addr", label: "Address", def_type: "raw_value", bits: 26, ranges: [[0, 25]] },
        { field: "scattered", label: "Scattered", def_type: "raw_value", bits: 8, ranges: [[0, 3], [8, 11]] },
        { field: "off", label: "Offset", def_type: "raw_value", bits: 3, ranges: [[16, 18]] },
    ],
    instruction_types: [
        { type: "J", description: "Jump", fields: ["opcode", "addr"], default_field_values: { opcode: 2 } },
        { type: "S", description: "Scatter set", fields: ["opcode", "scattered"] },
        { type: "B", description: "Branch", fields: ["opcode", "off"], default_field_values: { opcode: 3 } },
    ],
    instruction_set_config: [
        { mnemonic: "jmp", type: "J", operands: [["addr", "label_absolute"]] },
        { mnemonic: "set", type: "S", operands: [["scattered", "raw_value"]] },
        { mnemonic: "br", type: "B", operands: [["off", "label_relative"]] },
    ],
};

// label_absolute + instruction-type default_field_values layering.
{
    const result = assembleOk(".text\nmain:\n  jmp main\n", SYNTHETIC_ISA);
    checkHex("jmp main → opcode from type defaults → 0x08000000", result.instructions[0], 0x08000000);
}

// Multi-range scatter fields fold LSB-first in range order.
{
    const result = assembleOk(".text\n  set 0x1f\n", SYNTHETIC_ISA);
    checkHex("set 0x1f → scattered [[0,3],[8,11]] → 0x0000010f", result.instructions[0], 0x0000010f);
}

// Narrow (3-bit) label_relative field: an in-range negative offset masks in.
{
    const result = assembleOk(".text\nstart:\n  set 0\n  br start\n", SYNTHETIC_ISA);
    checkHex("br start (offset -2 in 3 bits) → 0x0c060000", result.instructions[1], 0x0c060000);
}

// -------------------------------------------------------- diagnostic classes

// Unknown mnemonic — also verifies the line/column contract.
{
    const diagnostic = checkDiagnostic("unknown-mnemonic", ".text\n  foo $t0, $t1, $t2\n");
    check("unknown-mnemonic: line", diagnostic?.line, 2);
    check("unknown-mnemonic: columnStart", diagnostic?.columnStart, 2);
    check("unknown-mnemonic: columnEnd", diagnostic?.columnEnd, 5);
}

checkDiagnostic("operand-count-mismatch", ".text\nadd $t0, $t1\n");
checkDiagnostic("invalid-register", ".text\nadd $t0, 5, $t2\n");
checkDiagnostic("invalid-register", ".text\nadd $t0, $t1, $33\n");
checkDiagnostic("undefined-label", ".text\nbeq $t0, $t1, nowhere\n");
checkDiagnostic("undefined-label", ".text\nlw $t0, nosuch\n");
checkDiagnostic("operand-type-mismatch", ".text\nlw $t0, 4$t0\n");
checkDiagnostic("operand-type-mismatch", ".text\njmp 5\n", SYNTHETIC_ISA);
checkDiagnostic("immediate-out-of-range", ".text\naddi $t0, $t1, 70000\n");
checkDiagnostic("immediate-out-of-range", ".data\nx: .word 4294967296\n.text\nnop\n");
checkDiagnostic("invalid-value", ".data\nx: .word abc\n.text\nnop\n");
checkDiagnostic("invalid-directive", ".data\nx: .dword 5\n.text\nnop\n");
checkDiagnostic("invalid-directive", ".data\nx: .word\n.text\nnop\n");
checkDiagnostic("duplicate-label", ".text\nmain:\nnop\nmain:\nnop\n");
checkDiagnostic("invalid-label", ".text\n1abc:\nnop\n");
checkDiagnostic("invalid-section", ".data extra\n.text\nnop\n");
checkDiagnostic(
    "branch-out-of-range",
    ".text\nstart:\n  br end\n  set 0\n  set 0\n  set 0\n  set 0\n  set 0\n  set 0\n  set 0\n  set 0\n  set 0\nend:\n  set 1\n",
    SYNTHETIC_ISA,
);
checkDiagnostic("invalid-config", ".text\nnop\n", { ...MIPS_ASSEMBLER_CONFIG, total_bits: 64 });

console.log("");
if (failures > 0) {
    console.error(`${failures} assembler check(s) FAILED.`);
    process.exit(1);
}
console.log("All assembler checks passed.");