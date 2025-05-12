import * as monaco from 'monaco-editor';
import { advanceRegisterNames, getDefaultInstructionDefOperands, getInstructionSyntax, getProgramLines, getPseudoCode } from '../../assets/js/utils';
import { useProjectStore } from '../../stores/projectStore';
import { Assembler } from '../../core/Assembler';
import { EditorUtils } from './editorUtils';

export function getCompletionsProvider() {

    const registers = EditorUtils.registers;


    function getRegisterCompletions(addComma: boolean = false, includeZero: boolean = false, triggerSuggest: boolean = false): monaco.languages.CompletionList {

        let list = registers.map((register) => ({
            label: register,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: register + (addComma ? ', ' : ''),
            detail: 'Register',
            documentation: {
                value: `Register ${register}`,
                isTrusted: true,
            },
            command: triggerSuggest ? { title: 'Trigger suggest', id: 'editor.action.triggerSuggest' } : undefined,
        })) as monaco.languages.CompletionItem[];
        if (!includeZero)
            list.shift();

        return {
            suggestions: list,
        };
    }



    return {
        triggerCharacters: [' ', '\t',],
        provideCompletionItems: (model, position, context, token): monaco.languages.CompletionList => {

            const line = model.getLineContent(position.lineNumber);
            const lineUntilPosition = line.substring(0, position.column - 1);
            const section = EditorUtils.getSection(model.getValue(), position.lineNumber);

            if (section === 'unknown') {
                // If dataSectionLineIndex and textSectionLineIndex are not defined, suggest both

                if (EditorUtils.dataSectionLineIndex == -1) {
                    return {
                        suggestions: [
                            {
                                label: '.data',
                                kind: monaco.languages.CompletionItemKind.Method,
                                range: new monaco.Range(position.lineNumber, 1, position.lineNumber, position.column),
                                insertText: '.data',
                                detail: 'Data Section',
                                documentation: {
                                    value: 'Data section',
                                    isTrusted: true,
                                },
                            }
                        ]
                    }
                }
                if (EditorUtils.textSectionLineIndex == -1 && EditorUtils.textSectionLineIndex == -1) {
                    return {
                        suggestions: [
                            {
                                label: '.text',
                                kind: monaco.languages.CompletionItemKind.Method,
                                insertText: '.text',
                                range: new monaco.Range(position.lineNumber, 1, position.lineNumber, position.column),
                                detail: 'Text Section',
                                documentation: {
                                    value: 'Text section',
                                    isTrusted: true,
                                },
                            }]
                    }
                }


                return {
                    suggestions: []
                };
            }
            else if (section === 'data') {
                let dataSuggestions: monaco.languages.CompletionItem[] = [];
                // if data is defined but text is not, suggest text
                if (EditorUtils.textSectionLineIndex == -1) {
                    dataSuggestions.push({
                        label: '.text',
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: '.text',
                        range: new monaco.Range(position.lineNumber, 1, position.lineNumber, position.column),
                        detail: 'Text Section',
                        documentation: {
                            value: 'Text section',
                            isTrusted: true,
                        },
                    });
                }

                // suggest accordiung to this syntax: <var_name>: <data_type> <value>


                const dataDirectives = Object.keys(Assembler.dataDirectivesSizeMap);
                // If the line is empty, suggest the whole syntax based on the data type
                if (line.trim() === '') {
                    dataDirectives.forEach((dataType) => {
                        dataSuggestions.push({
                            label: `${dataType} data_label`,
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: `\${1:data_label}: ${dataType} \${2:0}`,
                            range: new monaco.Range(position.lineNumber, 1, position.lineNumber, position.column),
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            detail: `Data directive ${dataType} (${Assembler.dataDirectivesSizeMap[dataType]} byte/s)`,
                            documentation: {
                                value: `Data directive ${dataType} used to define a variable of size ${Assembler.dataDirectivesSizeMap[dataType]} byte/s`,
                                isTrusted: true,
                            },
                        });
                    });

                    return {
                        suggestions: dataSuggestions,
                    };
                }


                // If the line is not empty, suggest the data type after the colon

                if (line.trim().endsWith(':')) {
                    dataDirectives.forEach((dataType) => {
                        dataSuggestions.push({
                            label: dataType,
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: `${dataType} \${1:0}`,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range: new monaco.Range(position.lineNumber, position.column - 1, position.lineNumber, position.column),
                            detail: `Directive ${dataType} (${Assembler.dataDirectivesSizeMap[dataType]} byte/s)`,
                        });
                    });

                    return {
                        suggestions: dataSuggestions,
                    };
                }


                const indexOfColon = line.indexOf(':');
                if (indexOfColon !== -1 && lineUntilPosition.trim().endsWith(':')) {
                    dataDirectives.forEach((dataType) => {
                        dataSuggestions.push({
                            label: dataType,
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: `${dataType}`,
                            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                            detail: `Directive ${dataType}`,
                            documentation: {
                                value: `Data directive ${dataType} used to define a variable of size ${Assembler.dataDirectivesSizeMap[dataType]} byte/s`,
                                isTrusted: true,
                            },
                        });
                    });

                    return {
                        suggestions: dataSuggestions,
                    };
                }
            }


            // If the line is empty or the cursor is at the end of the first word, suggest the instructions


            if (lineUntilPosition.trim().length === 0 || lineUntilPosition.trimStart().split(' ').length === 1 && !lineUntilPosition.trim().endsWith(':')) {
                const instructionSuggestions: monaco.languages.CompletionItem[] = EditorUtils.instructionSet.map((instruction) => ({
                    label: instruction.mnemonic,
                    kind: monaco.languages.CompletionItemKind.Method,
                    insertText: instruction.mnemonic + ((instruction.operands && instruction.operands.length == 0) ? '' : ' '),

                    command: (instruction.operands && instruction.operands.length == 0) ? undefined : { title: 'Trigger suggest', id: 'editor.action.triggerSuggest' },
                    detail: getInstructionSyntax(instruction),
                    documentation: {
                        value: `**${getPseudoCode(instruction).trim()}**` + '<br>' + instruction.description + '\n',
                        isTrusted: true,
                        supportHtml: true,
                    }
                })) as monaco.languages.CompletionItem[]

                const newLabelSuggestion: monaco.languages.CompletionItem = {
                    label: 'label',
                    kind: monaco.languages.CompletionItemKind.Reference,
                    insertText: '${1:label}:',
                    range: new monaco.Range(position.lineNumber, 1, position.lineNumber, position.column),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Label',
                    documentation: {
                        value: 'The label to jump to',
                        isTrusted: true
                    },
                }

                return {
                    suggestions: [...instructionSuggestions, newLabelSuggestion],
                };
            }

            // Find the instruction
            const mnemonic = line.trim().split(' ')[0];
            const instruction = EditorUtils.instructionSet.find((instruction: InstructionConfig) => instruction.mnemonic === mnemonic);

            if (!instruction) return { suggestions: [] };

            const operands = instruction.operands ?? getDefaultInstructionDefOperands(instruction);
            const operandIndex = lineUntilPosition.split(',').length - 1;
            const operand = operands[operandIndex];
            const isLastOperand = operandIndex === operands.length - 1;

            let currentOperand = lineUntilPosition.split(',').pop();
            // Trim all the beggining spaces
            currentOperand = currentOperand?.replace(/^\s+/, '');
            // IF there are still spaces, then don't suggest anything
            if (isLastOperand && currentOperand && currentOperand.includes(' ')) return { suggestions: [] };

            if (operand === 'REG_DESTINATION' || operand === 'REG_SOURCE' || operand === 'REG_TARGET') {
                const addComma = operands.length > 1 && operandIndex < operands.length - 1;
                const includeZero = operand !== 'REG_DESTINATION';
                const triggerSuggest = operandIndex < operands.length - 1;
                return getRegisterCompletions(addComma, includeZero, triggerSuggest);
            }

            if (operand === 'IMMEDIATE') {
                return {
                    suggestions: [
                        {
                            label: 'imm',
                            kind: monaco.languages.CompletionItemKind.Value,
                            insertText: '0',
                            detail: 'Immediate',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: {
                                value: 'Immediate value',
                                isTrusted: true,
                            },
                        } as monaco.languages.CompletionItem,
                    ],
                };
            }

            if (operand === 'SHAMT') {
                return {
                    suggestions: [
                        {
                            label: 'shamt',
                            kind: monaco.languages.CompletionItemKind.Value,
                            insertText: '0',
                            detail: 'Shift amount',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: {
                                value: 'Shift amount',
                                isTrusted: true,
                            },
                        } as monaco.languages.CompletionItem,
                    ],
                };
            }

            if (operand === 'MEM_ADDRESS') {
                const effectiveAddressSuggestion: monaco.languages.CompletionItem = {
                    label: 'effective address',
                    kind: monaco.languages.CompletionItemKind.Value,
                    insertText: `0(${EditorUtils.registerPrefix}0)`,
                    range: new monaco.Range(position.lineNumber, position.column - 1, position.lineNumber, position.column),
                    detail: 'Memory Address',
                    documentation: {
                        value: 'Memory address',
                        isTrusted: true,
                    },
                };
                return {
                    suggestions: [
                        effectiveAddressSuggestion,
                        // Data labels
                        ...EditorUtils.getDataLabels(model.getValue()).map((label) => ({
                            label: label,
                            kind: monaco.languages.CompletionItemKind.Reference,
                            insertText: label,
                            detail: 'Data Label',
                            documentation: {
                                value: 'Data label',
                                isTrusted: true,
                            },
                        })) as monaco.languages.CompletionItem[],
                    ]
                }
            }

            if (operand === 'LABEL') {
                const labels = EditorUtils.getLabels(model.getValue());
                const labelSuggestions = labels.map((label) => ({
                    label: label,
                    kind: monaco.languages.CompletionItemKind.Reference,
                    insertText: label,
                    detail: 'Label',
                    documentation: {
                        value: 'The label to jump to',
                        isTrusted: true,
                    },
                })) as monaco.languages.CompletionItem[];

                return {
                    suggestions: labelSuggestions,
                };
            }

            if (operand === 'NONE')
                return {
                    suggestions: [
                        {
                            label: 'none',
                            kind: monaco.languages.CompletionItemKind.Method,
                            insertText: 'none',
                            range: new monaco.Range(position.lineNumber, position.column - 1, position.lineNumber, position.column),
                            detail: 'No operand',
                            documentation: {
                                value: 'No operand',
                                isTrusted: true,
                            },
                        } as monaco.languages.CompletionItem,
                    ],
                };





            return { suggestions: [] };
        },
    } as monaco.languages.CompletionItemProvider;

}