import * as monaco from 'monaco-editor';
// import * as themeData from 'monaco-themes/themes/Dawn.json';
import INSTRUCTION_SET from '../assets/js/config/instructionSet';
import { InstructionDef, InstructionType, MemOp } from '../assets/js/interfaces/instruction';

// Constants
const mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
const registers = Array.from({ length: 32 }, (_, i) => `R${i}`);
const mnemonicRegex = new RegExp(`\\b(${mnemonics.join('|')})\\b`, 'g');
const registerRegex = new RegExp(`\\b(${registers.join('|')})\\b`, 'g');

// Monaco Language Registration
monaco.languages.register({ id: 'asm', extensions: ['.asm'] });
monaco.languages.setMonarchTokensProvider('asm', {
    tokenizer: {
        root: [
            [mnemonicRegex, 'mnemonic'],
            [registerRegex, 'register'],
            [/\b\d+\b/, 'immediate'],
            [/\b\w+:/, 'label'],
            [/;.*/, 'comment'],
        ],
    },
    ignoreCase: true,
    defaultToken: 'invalid',
    tokenPostfix: '.asm',
});

monaco.languages.setLanguageConfiguration('asm', {
    wordPattern: /[a-zA-Z]+/,
    autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
    ],
    comments: {
        lineComment: ';',
    },
});


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

function getInstructionSyntax(instruction: InstructionDef) {
    switch (instruction.type) {
        case InstructionType.R:
            return `${instruction.mnemonic} Rd, Rs1, Rs2`;
        case InstructionType.I:
            if (instruction.memOp == MemOp.LOAD || instruction.memOp == MemOp.STORE)
                return `${instruction.mnemonic} Rd, imm(Rn)`;
            return `${instruction.mnemonic} Rd, Rs, imm`;
        case InstructionType.J:
            return `${instruction.mnemonic} label`;
    }
}

// Completion Item Provider
monaco.languages.registerCompletionItemProvider('asm', {
    triggerCharacters: [' ', '\t'],
    provideCompletionItems: (model, position, context, token): monaco.languages.CompletionList => {
        const line = model.getLineContent(position.lineNumber);
        const lineUntilPosition = line.substring(0, position.column - 1);

        if (position.column <= line.search(/\S|$/) + 2) {
            return {
                suggestions: INSTRUCTION_SET.map((instruction) => ({
                    label: instruction.mnemonic,
                    kind: monaco.languages.CompletionItemKind.Method,
                    insertText: instruction.mnemonic + ' ',
                    command: { title: 'Trigger suggest', id: 'editor.action.triggerSuggest' },
                    detail: getInstructionSyntax(instruction),
                    documentation: {
                        value: instruction.description,
                        isTrusted: true,
                    }
                })) as monaco.languages.CompletionItem[]

            };
        }

        // Find the instruction
        const mnemonic = line.trim().split(' ')[0];
        const instruction = INSTRUCTION_SET.find((instruction) => instruction.mnemonic === mnemonic);

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
            if (instruction.memOp == MemOp.LOAD || instruction.memOp == MemOp.STORE) {
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

        return { suggestions: [] };
    },
});

// Validator
export function validate(model: monaco.editor.ITextModel) {
    const lines = model.getLinesContent();
    const errors: monaco.editor.IMarkerData[] = [];
    console.log('Validating', lines);

    lines.forEach((line: string, index: number) => {
        const mnemonic = line.trim().split(' ')[0];
        if (mnemonic !== '' && mnemonic !== ';') {
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
        }
    });

    monaco.editor.setModelMarkers(model, 'asm', errors);
}

// Theme Definition
const rules = [
    { token: 'mnemonic', foreground: '569CD6' },
    { token: 'register', foreground: 'D16969' },
    { token: 'immediate', foreground: '3f3f3f' },
    { token: 'label', foreground: 'DCDCAA' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
] as monaco.editor.ITokenThemeRule[];

monaco.editor.defineTheme('dlx', {
    base: 'vs',
    inherit: false,
    rules: rules,
    colors: {}
});

// monaco.editor.

export default monaco;
