import { Assembler } from "../../assets/js/core/Assembler";
import { getDefaultInstructionDefOperands, getEffectiveAddressImm, getEffectiveAddressRegister, isEffectiveAddress, isLabel, isValue, isXBit, isXBitSigned, isXBitUnsigned, toSigned } from "../../assets/js/utils";
import { useProjectStore } from "../../stores/projectStore";
import monaco from "../monaco";


export let validate = function (model: monaco.editor.ITextModel) {
}


export function updateValidationProvider(INSTRUCTION_SET: InstructionConfig[]) {
    const registerPrefix = useProjectStore().getProjectSetting('registerPrefix');
    const registers = Array.from({ length: 32 }, (_, i) => `${registerPrefix}${i}`);
    validate = function (model: monaco.editor.ITextModel) {

        const lines = model.getLinesContent();
        const errors: monaco.editor.IMarkerData[] = [];
        let labels = new Set<string>();
        let dataLabels = new Set<string>();
        console.log('Validating', lines);

        let currentSection = '.text';

        lines.forEach((line: string, index: number) => {
            const firstWord = line.trim().split(' ')[0].trim();

            if (firstWord.startsWith('.')) {
                const section = firstWord.trim();
                if (section === '.data' || section === '.text') {
                    currentSection = section;
                    return;
                }
            }

            // If we are validating the .data section, we need to check for variable declarations
            if (currentSection === '.data') {

                // If the line is empty or a comment or empty, skip it
                if (line.trim() === '' || line.trim()[0] === ';') return;

                // Syntax: <var_name>: .data <data_type> <value>
                // Car name has to be alphanumeric and cannot contain spaces
                const variableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
                const dataLabel = firstWord.split(':')[0].trim();
                if (!variableRegex.test(dataLabel)) {
                    errors.push({
                        startLineNumber: index + 1,
                        startColumn: 1,
                        endLineNumber: index + 1,
                        endColumn: line.length,
                        message: `Invalid data label: ${dataLabel}`,
                        severity: monaco.MarkerSeverity.Error,
                    });
                    return;
                }
                if (dataLabels.has(dataLabel)) {
                    errors.push({
                        startLineNumber: index + 1,
                        startColumn: 1,
                        endLineNumber: index + 1,
                        endColumn: line.length,
                        message: `Duplicate data label: ${dataLabel}`,
                        severity: monaco.MarkerSeverity.Error,
                    });
                    return;
                }

                const dataType = line.split(':')[1]?.trim().split(' ')[0].trim();
                if (!Assembler.dataDirectivesSizeMap[dataType]) {
                    errors.push({
                        startLineNumber: index + 1,
                        startColumn: 1,
                        endLineNumber: index + 1,
                        endColumn: line.length,
                        message: `Invalid directive: ${dataType}`,
                        severity: monaco.MarkerSeverity.Error,
                    });
                    return;
                }
                dataLabels.add(dataLabel);

                const value = line.split(':')[1]?.trim().split(' ')[1].trim();
                if (value === undefined) {
                    errors.push({
                        startLineNumber: index + 1,
                        startColumn: 1,
                        endLineNumber: index + 1,
                        endColumn: line.length,
                        message: `Missing value for data label: ${dataLabel}`,
                        severity: monaco.MarkerSeverity.Error,
                    });
                    return;
                }
                if (!isValue(value)) {
                    errors.push({
                        startLineNumber: index + 1,
                        startColumn: 1,
                        endLineNumber: index + 1,
                        endColumn: line.length,
                        message: `Invalid value for variable: ${dataLabel}`,
                        severity: monaco.MarkerSeverity.Error,
                    });
                    return;
                }

                // Make sure the value is in the correct range
                const dataTypeSize = Assembler.dataDirectivesSizeMap[dataType];
                const valueNumber = parseInt(value);
                if (!isXBit(valueNumber, dataTypeSize * 8)) {
                    errors.push({
                        startLineNumber: index + 1,
                        startColumn: 1,
                        endLineNumber: index + 1,
                        endColumn: line.length,
                        message: `Value out of range for ${dataType}: ${value}`,
                        severity: monaco.MarkerSeverity.Error,
                    });
                    return;
                }
                return;
            }




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

            const operands = line.trim().split(/,|\s/).slice(1).filter((operand) => operand !== '');

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
                    // If the number is not a 16 bit signed number, show a warning
                    const value = parseInt(operand);
                    if (!isXBitSigned(value, 16) && isXBitUnsigned(value, 16)) {
                        errors.push({
                            startLineNumber: index + 1,
                            startColumn: line.indexOf(operand) + 1,
                            endLineNumber: index + 1,
                            endColumn: line.indexOf(operand) + operand.length + 1,
                            message: `Immediate value ${operand} is a 16-bit number but is not signed. It will be interpreted as ${toSigned(value, 16)}.`,
                            severity: monaco.MarkerSeverity.Warning,
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
                } else if (operandType === 'MEM_ADDRESS') {
                    const variableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
                    const isEffectiveAddressEvaluated = isEffectiveAddress(operand);
                    if (!variableRegex.test(operand) && !isEffectiveAddressEvaluated)
                        errors.push({
                            startLineNumber: index + 1,
                            startColumn: line.indexOf(operand) + 1,
                            endLineNumber: index + 1,
                            endColumn: line.indexOf(operand) + operand.length + 1,
                            message: `Invalid memory address: ${operand}`,
                            severity: monaco.MarkerSeverity.Error,
                        });



                    if (isEffectiveAddressEvaluated) {
                        const [rs, value] = [registerPrefix + getEffectiveAddressRegister(operand).toString(), getEffectiveAddressImm(operand).toString()];
                        console.log('rs', rs, 'value', value);

                        // Check if the register is valid
                        if (!registers.includes(rs)) {
                            errors.push({
                                startLineNumber: index + 1,
                                startColumn: line.indexOf(rs) + 1,
                                endLineNumber: index + 1,
                                endColumn: line.indexOf(rs) + rs.length + 1,
                                message: `Invalid register in effective address: ${rs}`,
                                severity: monaco.MarkerSeverity.Error,
                            });
                        }
                        // Check if the value is a valid immediate value
                        if (isNaN(Number(value))) {
                            errors.push({
                                startLineNumber: index + 1,
                                startColumn: line.indexOf(value) + 1,
                                endLineNumber: index + 1,
                                endColumn: line.indexOf(value) + value.length + 1,
                                message: `Invalid immediate value in effective address: ${value}`,
                                severity: monaco.MarkerSeverity.Error,
                            });
                        }
                        // Check if the value is a 16 bit signed number
                        const valueNumber = parseInt(value);
                        if (!isXBitSigned(valueNumber, 16) && isXBitUnsigned(valueNumber, 16)) {
                            errors.push({
                                startLineNumber: index + 1,
                                startColumn: line.indexOf(value) + 1,
                                endLineNumber: index + 1,
                                endColumn: line.indexOf(value) + value.length + 1,
                                message: `Immediate value ${value} is a 16-bit number but is not signed. It will be interpreted as ${toSigned(valueNumber, 16)}.`,
                                severity: monaco.MarkerSeverity.Warning,
                            });
                        }
                    } else if (!dataLabels.has(operand)) {
                        errors.push({
                            startLineNumber: index + 1,
                            startColumn: line.indexOf(operand) + 1,
                            endLineNumber: index + 1,
                            endColumn: line.indexOf(operand) + operand.length + 1,
                            message: `Invalid memory address: ${operand}`,
                            severity: monaco.MarkerSeverity.Error,
                        });
                    }
                }
            }
        });
        monaco.editor.setModelMarkers(model, 'asm', errors);
    }
}