import * as monaco from 'monaco-editor';
import * as githubDarkTheme from 'monaco-themes/themes/GitHub Dark.json';
// import INSTRUCTION_SET from '../assets/js/config/instructionSet';
// import { InstructionType, MemOp } from '../assets/js/interfaces/instruction';
import { getCompletionsProvider } from './monaco/completionsProvider';
import { getDefinitionProvider } from './monaco/definitionProvider';
import { advanceRegisterNames, getDefaultInstructionDefOperands, isLabel } from '../assets/js/utils';
import { baseInstructionConfig } from '../assets/js/core/config/instructions';
import { getHoverProvider } from './monaco/hoverProvider';
import { updateValidationProvider } from './monaco/validationProvider';
import { useProjectStore } from '../stores/projectStore';
import { EditorUtils } from './monaco/editorUtils';


let completionsProvider: any | null = null;
let hoverProvider: any | null = null;
let definitionProvider: any | null = null;


export function initLSP(INSTRUCTION_SET: InstructionConfig[]) {

    // Constants
    EditorUtils.update(INSTRUCTION_SET);
    const registers = Array.from({ length: 32 }, (_, i) => `${i}`);
    const mnemonicRegex = new RegExp(`\\b(${EditorUtils.mnemonics.join('|')})\\b`, 'g');
    const registerRegex = new RegExp(`( |,)[R\\$](${registers.join('|')}|${advanceRegisterNames.join('|')})`, 'g');


    // Unregister all providers
    if (completionsProvider)
        completionsProvider.dispose();

    if (hoverProvider)
        hoverProvider.dispose();

    if (definitionProvider)
        definitionProvider.dispose();


    // Monaco Language Registration
    monaco.languages.register({ id: 'asm', extensions: ['.asm'] });
    monaco.languages.setMonarchTokensProvider('asm', {
        tokenizer: {
            root: [
                [mnemonicRegex, 'mnemonic'],
                [registerRegex, 'register'],
                [/\.(byte|half|word)/, 'data-directive'],
                [/\b\d+\b/, 'immediate'], // Decimal numbers
                [/\b0x[0-9a-fA-F]+\b/, 'immediate'], // Hexadecimal numbers
                [/\b0b[01]+\b/, 'immediate'], // Binary numbers
                [/\b\w+:/, 'label'],
                [/;.*/, 'comment'],
                [/\.(data|text)/, 'section'],
            ],
            label: [
                [/\w+/, 'label', '@pop']
            ]
        },
        ignoreCase: false,
        defaultToken: '',
        tokenPostfix: '.asm',
    });

    monaco.languages.setLanguageConfiguration('asm', {
        wordPattern: /[a-zA-Z_][a-zA-Z0-9_]+/,
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
    completionsProvider = monaco.languages.registerCompletionItemProvider('asm', getCompletionsProvider());

    // Hover Provider
    hoverProvider = monaco.languages.registerHoverProvider('asm', getHoverProvider());

    // Definition Provider
    definitionProvider = monaco.languages.registerDefinitionProvider('asm', getDefinitionProvider());

    // Validation
    updateValidationProvider();

};


// Theme Definition
const rulesDark = [
    { token: 'mnemonic', foreground: '9CDCFE' },
    { token: 'register', foreground: 'D16969' },
    { token: 'immediate', foreground: 'CE9178' },
    { token: 'label', foreground: 'DCDCAA' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'section', foreground: '4EC9B0' },
    { token: 'data-directive', foreground: '5A82D8' },
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
    { token: 'mnemonic', foreground: '5A82D8' },
    { token: 'register', foreground: 'D16969' },
    { token: 'immediate', foreground: '3f3f3f' },
    { token: 'label', foreground: 'ab4264' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'section', foreground: '006000' },
    { token: 'data-directive', foreground: '5A82D8' },
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
