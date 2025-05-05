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


let completionsProvider: any | null = null;
let hoverProvider: any | null = null;
let definitionProvider: any | null = null;


export function initLSP(INSTRUCTION_SET: InstructionConfig[]) {

    // Constants
    const mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
    const registerPrefix = useProjectStore().getProjectSetting('registerPrefix');
    const registers = Array.from({ length: 32 }, (_, i) => `${i}`);
    const mnemonicRegex = new RegExp(`\\b(${mnemonics.join('|')})\\b`, 'g');
    const registerRegex = new RegExp(`([R\\$](${registers.join('|')}|${advanceRegisterNames.join('|')}))\\b`, 'g');
    console.log('regex', registerRegex);


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
                [/\b\d+\b/, 'immediate'],
                [/\b\w+:/, 'label'],
                [/;.*/, 'comment'],
                [/\.(data|text)/, 'section'],
                [/\.(byte|half|word)/, 'data-type'],
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
    completionsProvider = monaco.languages.registerCompletionItemProvider('asm', getCompletionsProvider(INSTRUCTION_SET));

    // Hover Provider
    hoverProvider = monaco.languages.registerHoverProvider('asm', getHoverProvider(INSTRUCTION_SET));

    // Definition Provider
    definitionProvider = monaco.languages.registerDefinitionProvider('asm', getDefinitionProvider(INSTRUCTION_SET));

    // Validation
    updateValidationProvider(INSTRUCTION_SET);

};


// Theme Definition
const rulesDark = [
    { token: 'mnemonic', foreground: '9CDCFE' },
    { token: 'register', foreground: 'D16969' },
    { token: 'immediate', foreground: 'CE9178' },
    { token: 'label', foreground: 'DCDCAA' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'section', foreground: '4EC9B0' },
    { token: 'data-type', foreground: 'CE9178' },
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
    { token: 'section', foreground: '006000' },
    { token: 'data-type', foreground: '3f3f3f' },
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
