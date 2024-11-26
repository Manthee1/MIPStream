import * as monaco from 'monaco-editor';
// import * as themeData from 'monaco-themes/themes/Dawn.json';
import INSTRUCTION_SET from '../assets/js/config/instructionSet';
import { InstructionDef, InstructionType, MemOp } from '../assets/js/interfaces/instruction';
import completions from './monaco/completions';

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



// Completion Item Provider
monaco.languages.registerCompletionItemProvider('asm', completions);

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
