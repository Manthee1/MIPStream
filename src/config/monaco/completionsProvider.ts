import * as monaco from 'monaco-editor';
import { advanceRegisterNames, getDefaultInstructionDefOperands, getInstructionSyntax, getProgramLines } from '../../assets/js/utils';
import { useProjectStore } from '../../stores/projectStore';
import { Assembler } from '../../assets/js/core/Assembler';

export function getCompletionsProvider(INSTRUCTION_SET: InstructionConfig[]) {
    // Constants
    const mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
    const registerPrefix = useProjectStore().getProjectSetting('registerPrefix');
    const registers = [...Array.from({ length: 32 }, (_, i) => `${registerPrefix}${i}`), ...advanceRegisterNames.map(x => registerPrefix + x)]


    let dataSectionLineIndex = -1;
    let textSectionLineIndex = -1;

    function getlabels(code: string) {
        if (textSectionLineIndex === -1) return [];
        const lines = getProgramLines(code);
        const textSectionStart = textSectionLineIndex + 1;
        const textSectionEnd = lines.length;

        const labels = lines
            .slice(textSectionStart, textSectionEnd)
            .join('\n')
            .match(/(?<=^\s*)[a-zA-Z_]\w*(?=:)/gm);
        if (!labels) return [];
        return labels;
    }

    function getDataLabels(code: string) {
        const lines = getProgramLines(code);

        if (dataSectionLineIndex === -1) return [];
        const dataSectionEnd = textSectionLineIndex !== -1 ? textSectionLineIndex : lines.length;

        const dataLabels = lines
            .slice(dataSectionLineIndex + 1, dataSectionEnd)
            .join('\n')
            .match(/(?<=\n|^)([a-zA-Z_]\w*):/g);
        if (!dataLabels) return [];
        return dataLabels.map((label) => label.slice(0, -1));
    }


    // Figure out which section we are in. if indexed are already defined, use them
    function getSection(code: string, lineNumber: number) {
        const lines = getProgramLines(code);
        console.log(lineNumber, lines[dataSectionLineIndex], lines[textSectionLineIndex]);
        console.log(lines[dataSectionLineIndex]?.trim().startsWith('.data'), lines[textSectionLineIndex]?.trim().startsWith('.text'));


        // Check if both indexes are correct
        if (!lines[dataSectionLineIndex]?.trim().startsWith('.data') && !lines[textSectionLineIndex]?.trim().startsWith('.text')) {
            dataSectionLineIndex = -1;
            textSectionLineIndex = -1;
        }

        console.log(dataSectionLineIndex, textSectionLineIndex);
        if (dataSectionLineIndex == -1 && textSectionLineIndex == -1) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('.data')) {
                    dataSectionLineIndex = i;
                } else if (line.startsWith('.text')) {
                    textSectionLineIndex = i;
                }
            }
        }

        if (dataSectionLineIndex == -1 && textSectionLineIndex == -1) return 'unknown';

        if (lineNumber > textSectionLineIndex + 1) return 'text';
        if (lineNumber > dataSectionLineIndex && dataSectionLineIndex != -1) return 'data';
        return 'unknown';

    }


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
        triggerCharacters: [' ', '\t'],
        provideCompletionItems: (model, position, context, token): monaco.languages.CompletionList => {

            const line = model.getLineContent(position.lineNumber);
            const lineUntilPosition = line.substring(0, position.column - 1);
            const section = getSection(model.getValue(), position.lineNumber);
            console.log(section, dataSectionLineIndex, textSectionLineIndex);

            if (section === 'unknown') {
                // If dataSectionLineIndex and textSectionLineIndex are not defined, suggest both

                if (dataSectionLineIndex == -1) {
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
                if (textSectionLineIndex == -1 && textSectionLineIndex == -1) {
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
                if (textSectionLineIndex == -1) {
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


            if (position.column <= line.search(/\S|$/) + 2) {
                const instructionSuggestions: monaco.languages.CompletionItem[] = INSTRUCTION_SET.map((instruction) => ({
                    label: instruction.mnemonic,
                    kind: monaco.languages.CompletionItemKind.Method,
                    insertText: instruction.mnemonic + ((instruction.operands && instruction.operands.length == 0) ? '' : ' '),

                    command: (instruction.operands && instruction.operands.length == 0) ? undefined : { title: 'Trigger suggest', id: 'editor.action.triggerSuggest' },
                    detail: getInstructionSyntax(instruction),
                    documentation: {
                        value: instruction.description,
                        isTrusted: true,
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
            const instruction = INSTRUCTION_SET.find((instruction: InstructionConfig) => instruction.mnemonic === mnemonic);

            if (!instruction) return { suggestions: [] };


            console.log(line, mnemonic, lineUntilPosition, position);


            const operands = instruction.operands ?? getDefaultInstructionDefOperands(instruction);
            const operandIndex = lineUntilPosition.split(',').length - 1;
            const operand = operands[operandIndex];
            const isLastOperand = operandIndex === operands.length - 1;

            let currentOperand = lineUntilPosition.split(',').pop();
            // Trim all the beggining spaces
            currentOperand = currentOperand?.replace(/^\s+/, '');
            // IF there are still spaces, then don't suggest anything
            if (isLastOperand && currentOperand && currentOperand.includes(' ')) return { suggestions: [] };

            console.log(currentOperand, operand);

            console.log(operandIndex, operand, operands);

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

            if (operand === 'MEM_ADDRESS') {
                const effectiveAddressSuggestion: monaco.languages.CompletionItem = {
                    label: 'effective address',
                    kind: monaco.languages.CompletionItemKind.Value,
                    insertText: `0(${registerPrefix}0)`,
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
                        ...getDataLabels(model.getValue()).map((label) => ({
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
                const labels = getlabels(model.getValue());
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




            return { suggestions: [] };
        },
    } as monaco.languages.CompletionItemProvider;

}