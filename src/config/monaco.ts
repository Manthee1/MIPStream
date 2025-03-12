import * as monaco from 'monaco-editor';
import * as githubDarkTheme from 'monaco-themes/themes/GitHub Dark.json';
// import INSTRUCTION_SET from '../assets/js/config/instructionSet';
// import { InstructionType, MemOp } from '../assets/js/interfaces/instruction';
import completionsProvider from './monaco/completionsProvider';
import hoverProvider from './monaco/hoverProvider';
import definitionProvider from './monaco/definitionProvider';
import { getDefaultInstructionDefOperands, isLabel } from '../assets/js/utils';
import { instructionConfig } from '../assets/js/core/config/instructions';

// Constants
let INSTRUCTION_SET: InstructionConfig[] = instructionConfig;
const mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
const registers = Array.from({ length: 32 }, (_, i) => `R${i}`);
const mnemonicRegex = new RegExp(`\\b(${mnemonics.join('|')})\\b`, 'g');
const registerRegex = new RegExp(`\\b(${registers.join('|')})\\b`, 'g');
const JTypeMnemonics = INSTRUCTION_SET.filter((instruction) => instruction.type === 'J').map(
    (instruction) => instruction.mnemonic
);


// Monaco Language Registration
monaco.languages.register({ id: 'asm', extensions: ['.asm'] });
monaco.languages.setMonarchTokensProvider('asm', {
    tokenizer: {
        root: [
            // Match J-type instructions and their labels
            [new RegExp(`\\b(${JTypeMnemonics.join('|')})\\b`), 'mnemonic'],
            [new RegExp(`\\b(${JTypeMnemonics.join('|')})\\s+(\\w+)\\b`), [
                { token: 'mnemonic', next: '@label' },
                { token: 'label' }
            ]],
            [mnemonicRegex, 'mnemonic'],
            [registerRegex, 'register'],
            [/\b\d+\b/, 'immediate'],
            [/\b\w+:/, 'label'],
            [/;.*/, 'comment'],
        ],
        label: [
            [/\w+/, 'label', '@pop']
        ]
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
monaco.languages.registerCompletionItemProvider('asm', completionsProvider);

// Hover Provider
monaco.languages.registerHoverProvider('asm', hoverProvider);

// Definition Provider
monaco.languages.registerDefinitionProvider('asm', definitionProvider);


// Validator
export function validate(model: monaco.editor.ITextModel) {
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
        const expectedOperandTypes = instruction.operands ?? getDefaultInstructionDefOperands(instruction);

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

// Theme Definition
const rulesDark = [
    { token: 'mnemonic', foreground: '9CDCFE' },
    { token: 'register', foreground: 'D16969' },
    { token: 'immediate', foreground: 'CE9178' },
    { token: 'label', foreground: 'DCDCAA' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    ...githubDarkTheme.rules,
] as monaco.editor.ITokenThemeRule[];

monaco.editor.defineTheme('dark', {
    base: 'vs-dark',
    inherit: false,
    rules: rulesDark,
    colors: {
        "editor.foreground": "#cfcfcf",
    }
});

const rulesWhite = [
    { token: 'mnemonic', foreground: '5a82d8' },
    { token: 'register', foreground: 'D16969' },
    { token: 'immediate', foreground: '3f3f3f' },
    { token: 'label', foreground: 'ab4264' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
] as monaco.editor.ITokenThemeRule[];

monaco.editor.defineTheme('light', {
    base: 'vs',
    inherit: false,
    rules: rulesWhite,
    colors: {

    }
});



// monaco.editor.

export default monaco;
