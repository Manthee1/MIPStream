import * as monaco from 'monaco-editor';
import { getDefaultInstructionDefOperands, getInstructionSyntax } from '../../assets/js/utils';

export function getCompletionsProvider(INSTRUCTION_SET: InstructionConfig[]) {
    // Constants
    const mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
    const registers = Array.from({ length: 32 }, (_, i) => `R${i}`);
    const mnemonicRegex = new RegExp(`\\b(${mnemonics.join('|')})\\b`, 'g');
    const registerRegex = new RegExp(`\\b(${registers.join('|')})\\b`, 'g');


    function getlabels(code: string) {
        const labels = code.match(/(?<=\n|^)([a-zA-Z_]\w*):/g);
        if (!labels) return [];
        return labels.map((label) => label.slice(0, -1));

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
                return {
                    suggestions: [
                        {
                            label: 'address',
                            kind: monaco.languages.CompletionItemKind.Value,
                            insertText: '0(R0)',
                            detail: 'Memory Address',
                            documentation: {
                                value: 'Memory address',
                                isTrusted: true,
                            },
                        } as monaco.languages.CompletionItem
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