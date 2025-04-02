import { getDefaultInstructionDefOperands, isLabel } from "../../assets/js/utils";
import monaco from "../monaco";
const registers = Array.from({ length: 32 }, (_, i) => `R${i}`);

export let validate = function (model: monaco.editor.ITextModel) {
}


export function updateValidationProvider(INSTRUCTION_SET: InstructionConfig[]) {
    validate = function (model: monaco.editor.ITextModel) {

        const lines = model.getLinesContent();
        const errors: monaco.editor.IMarkerData[] = [];
        let labels = new Set<string>();
        console.log('Validating', lines);

        lines.forEach((line: string, index: number) => {
            const firstWord = line.trim().split(' ')[0].trim();
            if (firstWord.endsWith(':')) {
                const label = firstWord.slice(0, -1).trim();
                let labelErrorMessage = '';
                if (labels.has(label)) labelErrorMessage = `Duplicate label: ${label}`;
                if (label === '') labelErrorMessage = 'Empty label';
                if (label.includes(' ')) labelErrorMessage = 'Label cannot contain spaces';
                if (label.includes(':')) labelErrorMessage = 'Label cannot contain colon';
                if (!isLabel(label)) labelErrorMessage = 'Invalid label';
                if (labelErrorMessage !== '')
                    errors.push({
                        startLineNumber: index + 1,
                        startColumn: 1,
                        endLineNumber: index + 1,
                        endColumn: line.length,
                        message: labelErrorMessage,
                        severity: monaco.MarkerSeverity.Error,
                    });

                labels.add(label);
                return;
            }


            const mnemonic = firstWord;
            if (mnemonic == '' || mnemonic[0] == ';') return;

            const instruction = INSTRUCTION_SET.find((instruction) => instruction.mnemonic === mnemonic);
            if (!instruction) {
                errors.push({
                    startLineNumber: index + 1,
                    startColumn: 1,
                    endLineNumber: index + 1,
                    endColumn: line.length,
                    message: `Invalid mnemonic: ${mnemonic}`,
                    severity: monaco.MarkerSeverity.Error,
                });
                return;
            }
            const expectedOperandTypes = instruction.operands?.filter(op => op != 'NONE') ?? getDefaultInstructionDefOperands(instruction);

            const operands = line.split(/,|\s/).slice(1).filter((operand) => operand !== '');

            if (operands.length !== expectedOperandTypes.length) {
                errors.push({
                    startLineNumber: index + 1,
                    startColumn: line.indexOf(operands[0]) + 1,
                    endLineNumber: index + 1,
                    endColumn: operands.length == 0 ? 0 : line.indexOf(operands[operands.length - 1]) + operands[operands.length - 1].length + 1,
                    message: `Expected ${expectedOperandTypes.length} operands, but got ${operands.length}`,
                    severity: monaco.MarkerSeverity.Error,
                });
                return;
            }

            // If the the destination register is R0, show a warning
            const rdIndex = expectedOperandTypes.indexOf('REG_DESTINATION');
            if (rdIndex !== -1 && operands[rdIndex] === 'R0') {
                errors.push({
                    startLineNumber: index + 1,
                    startColumn: line.indexOf('R0') + 1,
                    endLineNumber: index + 1,
                    endColumn: line.indexOf('R0') + 3,
                    message: 'R0 should not be used as a destination register as it is hardwired to zero and will not be modified',
                    severity: monaco.MarkerSeverity.Warning,
                });
            }

            // Check if the operands are valid
            for (let i = 0; i < operands.length; i++) {
                const operand = operands[i];
                const operandType = expectedOperandTypes[i];
                if (operandType === 'REG_SOURCE' || operandType === 'REG_DESTINATION') {
                    if (!registers.includes(operand)) {
                        errors.push({
                            startLineNumber: index + 1,
                            startColumn: line.indexOf(operand) + 1,
                            endLineNumber: index + 1,
                            endColumn: line.indexOf(operand) + operand.length + 1,
                            message: `Invalid register: ${operand}`,
                            severity: monaco.MarkerSeverity.Error,
                        });
                    }
                } else if (operandType === 'IMMEDIATE') {
                    if (isNaN(Number(operand))) {
                        errors.push({
                            startLineNumber: index + 1,
                            startColumn: line.indexOf(operand) + 1,
                            endLineNumber: index + 1,
                            endColumn: line.indexOf(operand) + operand.length + 1,
                            message: `Invalid immediate value: ${operand}`,
                            severity: monaco.MarkerSeverity.Error,
                        });
                    }
                } else if (operandType === 'LABEL') {
                    if (!isLabel(operand)) {
                        errors.push({
                            startLineNumber: index + 1,
                            startColumn: line.indexOf(operand) + 1,
                            endLineNumber: index + 1,
                            endColumn: line.indexOf(operand) + operand.length + 1,
                            message: `Invalid label: ${operand}`,
                            severity: monaco.MarkerSeverity.Error,
                        });
                    }
                }

            }


        });

        monaco.editor.setModelMarkers(model, 'asm', errors);
    }
}