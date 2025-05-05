import * as monaco from 'monaco-editor';
import { useProjectStore } from '../../stores/projectStore';
import { decToBinary, decToHex, isValue, decToUnsigned, isRegister, advanceRegisterNames, getRegisterNumber, registerDescriptions } from '../../assets/js/utils';
// import * as themeData from 'monaco-themes/themes/Dawn.json';

export function getHoverProvider(INSTRUCTION_SET: InstructionConfig[]) {
    // Constants
    const mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
    const mnemonicRegex = new RegExp(`\\b(${mnemonics.join('|')})\\b`, 'g');

    return {
        provideHover: function (model, position) {
            const word = model.getWordAtPosition(position);
            if (word) {
                const { word: text } = word;
                console.log('text', text);

                if (mnemonicRegex.test(text)) {
                    const instruction = INSTRUCTION_SET.find(inst => inst.mnemonic === text);
                    if (instruction) {
                        setTimeout(() => {
                            // Find the data-href attribute of the first link
                            const link = document.querySelector(`a[data-href*="${instruction.mnemonic}--docs"]`);
                            if (!link) return;
                            link.addEventListener('click', (e) => {
                                console.log('clicked');
                                // useUIStore().showInstructionDocs(instruction);
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
                }


            }

            // Extract the value at position
            const lineContent = model.getLineContent(position.lineNumber);
            // Find the boundaries of the word ( the start or end can be anythings except alphanumeric)
            // Search forward for the first non-alphanumeric character
            console.log('position.column', position.column, lineContent, lineContent[position.column]);


            const allowedCharsRegex = /[\w-\$]/;

            let end = position.column - 1;
            for (; end < lineContent.length; end++) {
                const char = lineContent[end];
                if (!allowedCharsRegex.test(char)) {
                    break;
                }
            }
            // Search backward for the first non-alphanumeric character
            let start = position.column - 1;
            for (; start >= 0; start--) {
                const char = lineContent[start];
                if (!allowedCharsRegex.test(char)) {
                    start++;
                    break;
                }
            }
            // If start is -1, it means the word starts at the beginning of the line
            if (start < 0) {
                start = 0;
            }

            // Get the word
            const wordValue = lineContent.slice(start, end);

            // If it was hovered of a value show its signed, unsigned, hex and binary representation
            if (isValue(wordValue)) {
                const value = (wordValue.startsWith('0b')) ? parseInt(wordValue.slice(2), 2) : parseInt(wordValue);
                let [value32, value16, value8] = [value, value, value];
                value32 = value;
                value16 = (value << 16) >> 16;
                value8 = (value << 24) >> 24;
                const [unsignedValue32, unsignedValue16, unsignedValue8] = [value >>> 0, decToUnsigned(value16, 16), decToUnsigned(value8, 8)];
                return {
                    range: new monaco.Range(position.lineNumber, start + 1, position.lineNumber, end + 1),
                    contents: [
                        {
                            value: `
| Representation | 32-bit Value | 16-bit Value | 8-bit Value |
|----------------|--------------|--------------|-------------|
| **Signed**     | ${value32}     | ${value16}     | ${value8}     |
| **Unsigned**   | ${value >>> 0} | ${decToUnsigned(value16, 16)} | ${decToUnsigned(value8, 8)} |
| **Hex**        | 0x${decToHex(unsignedValue32, 32)} | 0x${decToHex(unsignedValue16, 16)} | 0x${decToHex(unsignedValue8, 8)} |
                            `
                        }
                    ]
                };
            }


            if (isRegister(wordValue)) {
                const registerValue = getRegisterNumber(wordValue);
                const prefix = wordValue[0];
                let alt = prefix + registerValue;
                if (!isNaN(Number(wordValue.slice(1)))) {
                    alt = prefix + advanceRegisterNames[registerValue];
                }
                return {
                    range: new monaco.Range(position.lineNumber, start + 1, position.lineNumber, end + 1),
                    contents: [
                        { value: `**Register ${wordValue} (${alt})**` },
                        { value: registerDescriptions[registerValue].description },
                    ]
                };
            }


            return null;
        }
    } as monaco.languages.HoverProvider;
}