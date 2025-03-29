import * as monaco from 'monaco-editor';

export function getDefinitionProvider(INSTRUCTION_SET: InstructionConfig[]) {

    // Constants
    const mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
    const registers = Array.from({ length: 32 }, (_, i) => `R${i}`);
    const mnemonicRegex = new RegExp(`\\b(${mnemonics.join('|')})\\b`, 'g');
    const registerRegex = new RegExp(`\\b(${registers.join('|')})\\b`, 'g');




    return {
        provideDefinition: function (model, position, _token) {
            console.log(model.getWordAtPosition(position));
            const word = model.getWordAtPosition(position);

            if (word) {
                const text = word.word;
                console.log(text);

                if (mnemonicRegex.test(text)) {
                    const instruction = INSTRUCTION_SET.find(inst => inst.mnemonic === text);
                    if (instruction) {
                        return {
                            // range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                            // uri: 0,
                        } as monaco.languages.ProviderResult<monaco.languages.Location>;
                    }
                }
            }
            return null;
        }
    } as monaco.languages.DefinitionProvider;
}