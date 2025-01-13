import * as monaco from 'monaco-editor';
// import * as themeData from 'monaco-themes/themes/Dawn.json';
let INSTRUCTION_SET: InstructionConfig[] = [];


// Constants
const mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
const registers = Array.from({ length: 32 }, (_, i) => `R${i}`);
const mnemonicRegex = new RegExp(`\\b(${mnemonics.join('|')})\\b`, 'g');
const registerRegex = new RegExp(`\\b(${registers.join('|')})\\b`, 'g');

export default {
    provideHover: function (model, position) {
        const word = model.getWordAtPosition(position);
        if (word) {
            const { word: text } = word;
            if (mnemonicRegex.test(text)) {
                const instruction = INSTRUCTION_SET.find(inst => inst.mnemonic === text);
                if (instruction) {
                    setTimeout(() => {
                        // Find the data-href attribute of the first link
                        const link = document.querySelector(`a[data-href*="${instruction.mnemonic}--docs"]`);
                        if (!link) return;
                        link.addEventListener('click', (e) => {
                            console.log('clicked');
                            // useViewStore().showInstructionDocs(instruction);
                        });
                    }, 1000);

                    return {
                        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                        contents: [
                            {
                                value: `*(Instruction)* [**${instruction.mnemonic}**](${instruction.mnemonic}--docs) <br> ${instruction.description}`,
                                supportThemeIcons: true,
                                supportHtml: true
                            }
                        ]
                    };
                }
            } else if (registerRegex.test(text)) {
                return {
                    range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                    contents: [
                        { value: `** Register ${text} ** ` },
                        { value: 'General purpose register' }
                    ]
                };
            }
        }
        return null;
    }
} as monaco.languages.HoverProvider;