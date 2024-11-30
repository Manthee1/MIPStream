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
