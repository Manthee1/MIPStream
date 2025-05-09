import { advanceRegisterNames, getProgramLines } from "../../assets/js/utils";
import { useProjectStore } from "../../stores/projectStore";

export class EditorUtils {
    static instructionSet: InstructionConfig[] = [];
    static mnemonics: string[] = [];
    static registerPrefix: string = 'R';
    static registers: string[] = [];

    static update(INSTRUCTION_SET: InstructionConfig[]) {
        // Constants
        EditorUtils.instructionSet = INSTRUCTION_SET;
        EditorUtils.mnemonics = INSTRUCTION_SET.map((instruction) => instruction.mnemonic);
        EditorUtils.registerPrefix = useProjectStore().getProjectSetting('registerPrefix') as string;
        EditorUtils.registers = [
            ...Array.from({ length: 32 }, (_, i) => EditorUtils.registerPrefix + i),
            ...advanceRegisterNames.map(x => EditorUtils.registerPrefix + x)
        ];

        EditorUtils.dataSectionLineIndex = -1;
        EditorUtils.textSectionLineIndex = -1;
    }

    static dataSectionLineIndex: number = -1;
    static textSectionLineIndex: number = -1;

    static getLabels(code: string): string[] {
        if (EditorUtils.textSectionLineIndex === -1) return [];
        const lines = getProgramLines(code);
        const textSectionStart = EditorUtils.textSectionLineIndex + 1;
        const textSectionEnd = lines.length;

        const labels = lines
            .slice(textSectionStart, textSectionEnd)
            .join('\n')
            .match(/(?<=^\s*)[a-zA-Z_]\w*(?=:)/gm);
        if (!labels) return [];
        return labels;
    }

    static getDataLabels(code: string): string[] {
        const lines = getProgramLines(code);

        if (EditorUtils.dataSectionLineIndex === -1) return [];
        const dataSectionEnd = EditorUtils.textSectionLineIndex !== -1 ? EditorUtils.textSectionLineIndex : lines.length;

        const dataLabels = lines
            .slice(EditorUtils.dataSectionLineIndex + 1, dataSectionEnd)
            .join('\n')
            .match(/(?<=\n|^)([a-zA-Z_]\w*):/g);
        if (!dataLabels) return [];
        return dataLabels.map((label) => label.slice(0, -1));
    }

    static updateSectionLineIndexes(code: string) {
        const lines = code.split('\n');

        if (
            !lines[EditorUtils.dataSectionLineIndex]?.trim().startsWith('.data') &&
            !lines[EditorUtils.textSectionLineIndex]?.trim().startsWith('.text')
        ) {
            EditorUtils.dataSectionLineIndex = -1;
            EditorUtils.textSectionLineIndex = -1;
        }

        if (EditorUtils.dataSectionLineIndex == -1 && EditorUtils.textSectionLineIndex == -1) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('.data')) {
                    EditorUtils.dataSectionLineIndex = i;
                } else if (line.startsWith('.text')) {
                    EditorUtils.textSectionLineIndex = i;
                }
            }
        }
    }

    static getSection(code: string, lineNumber: number): string {
        EditorUtils.updateSectionLineIndexes(code);

        if (EditorUtils.dataSectionLineIndex == -1 && EditorUtils.textSectionLineIndex == -1) return 'unknown';

        if (lineNumber > EditorUtils.textSectionLineIndex + 1) return 'text';
        if (lineNumber > EditorUtils.dataSectionLineIndex && EditorUtils.dataSectionLineIndex != -1) return 'data';
        return 'unknown';
    }


    static getSectionCodeLines(code: string, section: string): string[] {
        EditorUtils.updateSectionLineIndexes(code);
        const lines = code.split('\n');
        if (section === 'text') {
            if (EditorUtils.textSectionLineIndex === -1) return [];
            return lines.slice(EditorUtils.textSectionLineIndex);
        } else if (section === 'data') {
            if (EditorUtils.textSectionLineIndex === -1) return [];
            return lines.slice(EditorUtils.dataSectionLineIndex, EditorUtils.textSectionLineIndex);
        }
        return [];
    }

    static getHoverdValue(lineContent: string, column: number) {
        // Extract the value at position
        // Find the boundaries of the word ( the start or end can be anythings except alphanumeric)
        // Search forward for the first non-alphanumeric character


        const allowedCharsRegex = /[\w-\.\$]/;

        let end = column - 1;
        for (; end < lineContent.length; end++) {
            const char = lineContent[end];
            if (!allowedCharsRegex.test(char)) {
                break;
            }
        }
        // Search backward for the first non-alphanumeric character
        let start = column - 1;
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
        const value = lineContent.slice(start, end);
        return { value, start, end, };
    }
}