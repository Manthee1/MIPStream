import * as monaco from 'monaco-editor';
// import * as themeData from 'monaco-themes/themes/Dawn.json';
import { getInstructionSyntax } from '../../assets/js/utils';
import { InstructionType } from '../../assets/js/types/enums';

let INSTRUCTION_SET: InstructionConfig[] = [];

// Constants
const mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
const registers = Array.from({ length: 32 }, (_, i) => `R${i}`);
const mnemonicRegex = new RegExp(`\\b(${mnemonics.join('|')})\\b`, 'g');
const registerRegex = new RegExp(`\\b(${registers.join('|')})\\b`, 'g');



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

function getlabels(code: string) {
    const labels = code.match(/(?<=\n|^)([a-zA-Z_]\w*):/g);
    if (!labels) return [];
    return labels.map((label) => label.slice(0, -1));

}


export default {
    triggerCharacters: [' ', '\t'],
    provideCompletionItems: (model, position, context, token): monaco.languages.CompletionList => {

        const line = model.getLineContent(position.lineNumber);
        const lineUntilPosition = line.substring(0, position.column - 1);

        if (position.column <= line.search(/\S|$/) + 2) {
            const instructionSuggestions: monaco.languages.CompletionItem[] = INSTRUCTION_SET.map((instruction) => ({
                label: instruction.mnemonic,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: instruction.mnemonic + ' ',

                command: (instruction.mnemonic === 'NOP' || instruction.mnemonic === 'HALT') ? undefined : { title: 'Trigger suggest', id: 'editor.action.triggerSuggest' },
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

        if (!instruction || instruction.mnemonic === 'NOP' || instruction.mnemonic === 'HALT') return { suggestions: [] };

        const registerCount = lineUntilPosition.match(registerRegex)?.length ?? 0;


        // R-type instructions
        if (instruction.type === InstructionType.R) {
            // Only 3 registers are allowed for R-type instructions. 
            if (registerCount === 3) return { suggestions: [] };

            const isLastRegister = (registerCount === 2);
            return getRegisterCompletions(!isLastRegister, false, !isLastRegister);
        }


        // I-type instructions
        if (instruction.type === InstructionType.I) {

            // If there is no register
            if (registerCount == 0) return getRegisterCompletions(true, true, true);

            // If the instruction is a load or store instruction
            if (false) {
                // Suggest imm(Rn)
                if (lineUntilPosition.trim().split(',').length === 2) {

                    return {
                        suggestions: [
                            {
                                label: 'imm(Rn)',
                                kind: monaco.languages.CompletionItemKind.Snippet,
                                insertText: '${1:imm}(${2:Rn})',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                detail: 'Memory Address',
                                documentation: {
                                    value: 'imm is the immediate value and Rn is the register number. The value of Rn is added to imm to get the memory address',
                                    isTrusted: true
                                },
                            },
                        ] as monaco.languages.CompletionItem[]
                    };
                }
            }

            if (registerCount === 1)
                return getRegisterCompletions(true, false, true);



            return {
                suggestions: [
                    {
                        label: 'immediate',
                        kind: monaco.languages.CompletionItemKind.Constant,
                        insertText: '0',
                    }
                ] as monaco.languages.CompletionItem[]
            };


        }

        if (instruction.type === InstructionType.J) {
            return {
                suggestions: getlabels(model.getValue()).map((label) => ({
                    label: label,
                    kind: monaco.languages.CompletionItemKind.Reference,
                    insertText: label,
                    detail: 'Label',
                    documentation: {
                        value: `The label to jump to`,
                        isTrusted: true,
                    },
                })) as monaco.languages.CompletionItem[]
            };
        }

        return { suggestions: [] };
    },
} as monaco.languages.CompletionItemProvider;