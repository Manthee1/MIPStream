/** @format */

/**
 * Operand → field-value resolution for the config-driven assembler. Maps each
 * operand token onto instruction fields using the PDL operand vocabulary
 * (`register`, `raw_value`, `label_absolute`, `label_relative`,
 * `memory_address`) — no ISA-specific constants live here.
 */

import type {
    AssemblerFieldConfig,
    InstructionConfig,
    InstructionOperandConfig,
} from "@/shared/types/isa";
import { widthMask } from "@/shared/utils/bit-ops";
import type { DiagnosticCollector } from "@/shared/utils/errors";
import { isXBit, isXBitSigned } from "@/shared/utils/number";
import { getRegisterNumber, isRegister, isValidRegister } from "@/shared/utils/registers";
import type { Token } from "./tokenize";
import { parseSignedValue } from "./values";

/** Resolution inputs shared by every operand of one instruction. */
export interface OperandResolutionContext {
    /** Text labels → instruction index (label_absolute / label_relative). */
    labels: Map<string, number>;
    /** Data labels → byte offset in the `.data` image (memory_address). */
    dataLabels: Map<string, number>;
    /** Instruction index of the instruction being encoded. */
    pc: number;
}

const LABEL_IDENTIFIER = /^[A-Za-z_]\w*$/;

/**
 * Maps operand tokens onto field values for one instruction line. `baseValues`
 * carries the instruction-type `default_field_values` merged with the
 * instruction's `field_values`. Returns null when a diagnostic was emitted —
 * the caller encodes a zero word so the slot (and pcLineMap) stays aligned.
 */
export function resolveOperandValues(
    instruction: InstructionConfig,
    baseValues: Record<string, number>,
    mnemonicToken: Token,
    operandTokens: Token[],
    fields: Map<string, AssemblerFieldConfig>,
    context: OperandResolutionContext,
    diagnostics: DiagnosticCollector,
): Record<string, number> | null {
    const fieldValues: Record<string, number> = { ...baseValues };

    if (operandTokens.length !== instruction.operands.length) {
        const hasOperands = operandTokens.length > 0;
        diagnostics.add(
            "operand-count-mismatch",
            `Instruction "${instruction.mnemonic}" expects ${instruction.operands.length} operand(s), got ${operandTokens.length}.`,
            mnemonicToken.line,
            hasOperands ? operandTokens[0].columnStart : mnemonicToken.columnStart,
            hasOperands ? operandTokens[operandTokens.length - 1].columnEnd : mnemonicToken.columnEnd,
        );
        return null;
    }

    for (let i = 0; i < instruction.operands.length; i++) {
        if (!applyOperand(instruction.operands[i], operandTokens[i], fieldValues, fields, context, diagnostics)) {
            return null;
        }
    }

    return fieldValues;
}

function applyOperand(
    operand: InstructionOperandConfig,
    token: Token,
    fieldValues: Record<string, number>,
    fields: Map<string, AssemblerFieldConfig>,
    context: OperandResolutionContext,
    diagnostics: DiagnosticCollector,
): boolean {
    const [fieldName, explicitType, baseFieldName] = operand;
    const field = fields.get(fieldName);
    if (field === undefined) {
        diagnostics.add(
            "invalid-config",
            `Instruction operand references unknown field "${fieldName}".`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return false;
    }

    switch (explicitType ?? field.def_type) {
        case "register":
            return applyRegister(fieldName, token, fieldValues, diagnostics);
        case "raw_value":
            return applyRawValue(field, token, fieldValues, diagnostics);
        case "label_absolute":
            return applyLabel(fieldName, token, fieldValues, context, diagnostics);
        case "label_relative":
            return applyRelativeLabel(field, token, fieldValues, context, diagnostics);
        case "memory_address":
            return applyMemoryAddress(baseFieldName, field, token, fieldValues, fields, context, diagnostics);
    }
}

function applyRegister(
    fieldName: string,
    token: Token,
    fieldValues: Record<string, number>,
    diagnostics: DiagnosticCollector,
): boolean {
    if (!isRegister(token.text)) {
        diagnostics.add(
            "invalid-register",
            `Expected a register, got "${token.text}".`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return false;
    }
    const registerNumber = getRegisterNumber(token.text);
    if (!isValidRegister(registerNumber)) {
        diagnostics.add(
            "invalid-register",
            `Register "${token.text}" is out of range (0-31).`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return false;
    }
    fieldValues[fieldName] = registerNumber;
    return true;
}

function applyRawValue(
    field: AssemblerFieldConfig,
    token: Token,
    fieldValues: Record<string, number>,
    diagnostics: DiagnosticCollector,
): boolean {
    const value = parseSignedValue(token.text);
    if (value === null) {
        diagnostics.add(
            "invalid-value",
            `Expected a numeric value, got "${token.text}".`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return false;
    }
    // Accept any value representable in the field width (signed or unsigned).
    if (!isXBit(value, field.bits)) {
        diagnostics.add(
            "immediate-out-of-range",
            `Value ${token.text} does not fit a ${field.bits}-bit field.`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return false;
    }
    fieldValues[field.field] = value & widthMask(field.bits);
    return true;
}

function applyLabel(
    fieldName: string,
    token: Token,
    fieldValues: Record<string, number>,
    context: OperandResolutionContext,
    diagnostics: DiagnosticCollector,
): boolean {
    if (!LABEL_IDENTIFIER.test(token.text)) {
        diagnostics.add(
            "operand-type-mismatch",
            `Expected a label, got "${token.text}".`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return false;
    }
    const target = context.labels.get(token.text);
    if (target === undefined) {
        diagnostics.add(
            "undefined-label",
            `Undefined label "${token.text}".`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return false;
    }
    // Addressing model: labels resolve to instruction indices (word
    // addressing) — the Phase 3 datapath PC must count instructions to match.
    fieldValues[fieldName] = target;
    return true;
}

function applyRelativeLabel(
    field: AssemblerFieldConfig,
    token: Token,
    fieldValues: Record<string, number>,
    context: OperandResolutionContext,
    diagnostics: DiagnosticCollector,
): boolean {
    if (!LABEL_IDENTIFIER.test(token.text)) {
        diagnostics.add(
            "operand-type-mismatch",
            `Expected a label, got "${token.text}".`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return false;
    }
    const target = context.labels.get(token.text);
    if (target === undefined) {
        diagnostics.add(
            "undefined-label",
            `Undefined label "${token.text}".`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return false;
    }
    // Branch offset in instruction words, relative to the next instruction
    // (target − pc − 1, matching real MIPS beq semantics).
    const offset = target - context.pc - 1;
    if (!isXBitSigned(offset, field.bits)) {
        diagnostics.add(
            "branch-out-of-range",
            `Label "${token.text}" is too far away (offset ${offset} does not fit ${field.bits} signed bits).`,
            token.line,
            token.columnStart,
            token.columnEnd,
        );
        return false;
    }
    fieldValues[field.field] = offset & widthMask(field.bits);
    return true;
}

function applyMemoryAddress(
    baseFieldName: string | undefined,
    field: AssemblerFieldConfig,
    token: Token,
    fieldValues: Record<string, number>,
    fields: Map<string, AssemblerFieldConfig>,
    context: OperandResolutionContext,
    diagnostics: DiagnosticCollector,
): boolean {
    // Effective address form: imm($reg) — the offset folds into this field
    // and the base register into the operand's declared base field.
    const effective = parseEffectiveAddress(token.text);
    if (effective !== null) {
        const immediate = parseSignedValue(effective.immediateText);
        if (immediate === null || !isXBit(immediate, field.bits)) {
            diagnostics.add(
                "immediate-out-of-range",
                `Offset "${effective.immediateText}" does not fit a ${field.bits}-bit field.`,
                token.line,
                token.columnStart,
                token.columnEnd,
            );
            return false;
        }
        if (!isRegister(effective.registerText)) {
            diagnostics.add(
                "invalid-register",
                `Expected a base register, got "${effective.registerText}".`,
                token.line,
                token.columnStart,
                token.columnEnd,
            );
            return false;
        }
        const registerNumber = getRegisterNumber(effective.registerText);
        if (!isValidRegister(registerNumber)) {
            diagnostics.add(
                "invalid-register",
                `Register "${effective.registerText}" is out of range (0-31).`,
                token.line,
                token.columnStart,
                token.columnEnd,
            );
            return false;
        }
        const baseField = baseFieldName !== undefined ? fields.get(baseFieldName) : undefined;
        if (baseField === undefined) {
            diagnostics.add(
                "invalid-config",
                `Memory operand "${token.text}" is missing its base register field.`,
                token.line,
                token.columnStart,
                token.columnEnd,
            );
            return false;
        }
        fieldValues[baseField.field] = registerNumber;
        fieldValues[field.field] = immediate & widthMask(field.bits);
        return true;
    }

    // Bare data label form: the label's byte offset becomes the immediate and
    // the base register keeps its default (legacy-compatible). Phase 2's
    // write-back must reconcile byte offsets with the word-addressed dmem.
    if (LABEL_IDENTIFIER.test(token.text)) {
        const offset = context.dataLabels.get(token.text);
        if (offset === undefined) {
            diagnostics.add(
                "undefined-label",
                `Undefined data label "${token.text}".`,
                token.line,
                token.columnStart,
                token.columnEnd,
            );
            return false;
        }
        if (!isXBit(offset, field.bits)) {
            diagnostics.add(
                "immediate-out-of-range",
                `Data label "${token.text}" (byte offset ${offset}) does not fit a ${field.bits}-bit field.`,
                token.line,
                token.columnStart,
                token.columnEnd,
            );
            return false;
        }
        fieldValues[field.field] = offset & widthMask(field.bits);
        return true;
    }

    diagnostics.add(
        "operand-type-mismatch",
        `Expected an address like "imm($reg)" or a data label, got "${token.text}".`,
        token.line,
        token.columnStart,
        token.columnEnd,
    );
    return false;
}

/** Parses "imm($reg)" — returns null for anything else (no partial matches). */
function parseEffectiveAddress(text: string): { immediateText: string; registerText: string } | null {
    const open = text.indexOf("(");
    if (open <= 0) return null;
    const close = text.indexOf(")");
    if (close === -1 || close !== text.length - 1) return null;
    const immediateText = text.slice(0, open).trim();
    const registerText = text.slice(open + 1, close).trim();
    if (immediateText.length === 0 || registerText.length === 0) return null;
    return { immediateText, registerText };
}