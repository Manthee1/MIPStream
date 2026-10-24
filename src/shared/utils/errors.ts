/** @format */

export enum ErrorType {
    SYNTAX_ERROR = "Syntax Error",
    RUNTIME_ERROR = "Runtime Error",
    LOGIC_ERROR = "Logic Error",
    TYPE_ERROR = "Type Error"
}

export class AssemblerError {
    type: ErrorType;
    lineNumber: number;
    message: string;

    constructor(type: ErrorType, lineNumber: number, message: string) {
        this.type = type;
        this.lineNumber = lineNumber;
        this.message = message;
    }

    toString() {
        return `${this.type} on line ${this.lineNumber}: ${this.message}`;
    }
}

export class AssemblerErrorList {
    errors: AssemblerError[];

    constructor(errors: AssemblerError[]) {
        this.errors = errors;
    }

    push(error: AssemblerError) {
        this.errors.push(error);
    }

    get length() {
        return this.errors.length;
    }

    get(index: number) {
        return this.errors[index];
    }

    get messages() {
        return this.errors.map(error => error.message);
    }

    forEach(callback: (error: AssemblerError) => void) {
        this.errors.forEach(callback);
    }
}

// ---------------------------------------------------------------------------
// Config-driven assembler diagnostics (src/core/assembler)
// ---------------------------------------------------------------------------

/**
 * Machine-checkable diagnostic codes emitted by the config-driven assembler
 * (`src/core/assembler/`). One code per assembler error class.
 */
export type DiagnosticCode =
    | "unknown-mnemonic"
    | "operand-count-mismatch"
    | "operand-type-mismatch"
    | "undefined-label"
    | "duplicate-label"
    | "invalid-label"
    | "invalid-register"
    | "immediate-out-of-range"
    | "branch-out-of-range"
    | "invalid-directive"
    | "invalid-value"
    | "invalid-section"
    | "invalid-config";

/**
 * A single assembler diagnostic. The line/column contract is designed up front
 * as the editor lint integration (CodeMirror) shape so diagnostics never need
 * a reformatting pass: `line` is 1-based, `columnStart` is 0-based inclusive
 * and `columnEnd` is 0-based exclusive (covering columnStart..columnEnd-1).
 */
export interface AssemblerDiagnostic {
    code: DiagnosticCode;
    message: string;
    line: number;
    columnStart: number;
    columnEnd: number;
}

/** Collects diagnostics across an `assemble()` run (the assembler never throws). */
export class DiagnosticCollector {
    readonly items: AssemblerDiagnostic[] = [];

    add(code: DiagnosticCode, message: string, line: number, columnStart: number, columnEnd: number): void {
        this.items.push({ code, message, line, columnStart, columnEnd });
    }

    get length(): number {
        return this.items.length;
    }
}
