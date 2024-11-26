import * as monaco from 'monaco-editor';
// import * as themeData from 'monaco-themes/themes/Dawn.json';
import INSTRUCTION_SET from '../../assets/js/config/instructionSet';
import { InstructionDef, InstructionType, MemOp } from '../../assets/js/interfaces/instruction';
import { getInstructionSyntax } from '../../assets/js/utils';

// Constants
const mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
const registers = Array.from({ length: 32 }, (_, i) => `R${i}`);
const mnemonicRegex = new RegExp(`\\b(${mnemonics.join('|')})\\b`, 'g');
const registerRegex = new RegExp(`\\b(${registers.join('|')})\\b`, 'g');




export default {
    provideDefinition: function (model, position) {
        console.log(model.getWordAtPosition(position));
        const word = model.getWordAtPosition(position);

        if (word) {
            const text = word.word;
            console.log(text);

            if (mnemonicRegex.test(text)) {
                const instruction = INSTRUCTION_SET.find(inst => inst.mnemonic === text);
                if (instruction) {
                    return {
                        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                        uri: 0,
                    };
                }
            }
        }
        return null;
    }
} as monaco.languages.DefinitionProvider;