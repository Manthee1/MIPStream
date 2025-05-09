import * as monaco from 'monaco-editor';
import { useProjectStore } from '../../stores/projectStore';
import { EditorUtils } from './editorUtils';
import { getDefaultInstructionDefOperands, getProgramLines } from '../../assets/js/utils';




export function getDefinitionProvider(): monaco.languages.DefinitionProvider {

    // Constants
    const registerPrefix = EditorUtils.registerPrefix;
    const registers = EditorUtils.registers;
    const mnemonics = EditorUtils.mnemonics
    return {
        provideDefinition: function (model, position, _token) {
            const { value, start, end } = EditorUtils.getHoverdValue(model.getLineContent(position.lineNumber), position.column);

            const section = EditorUtils.getSection(model.getValue(), position.lineNumber);

            if (section === 'text') {
                // Get instruction operands\
                const line = model.getLineContent(position.lineNumber).split(';')[0].replace(/\s+/g, ' ').trim();
                const mnemonic = line.trim().split(' ')[0];
                const instruction = EditorUtils.instructionSet.find((instruction: InstructionConfig) => instruction.mnemonic === mnemonic);
                if (!instruction) return null;
                // Find hovered operand index
                const operands = line.split(' ').slice(1);
                const operandIndex = operands.findIndex((operand: string) => {
                    return operand.trim() == value.trim();
                });
                if (operandIndex == -1) return null;
                const operandTypes = instruction.operands ?? getDefaultInstructionDefOperands(instruction);
                const operandType = operandTypes[operandIndex];
                if (!operandType) return null;

                if (operandType == 'MEM_ADDRESS') {

                    const dataLabels = EditorUtils.getDataLabels(model.getValue());

                    const dataLabel = dataLabels.find((label: string) => label.trim() == value.trim());
                    if (!dataLabel) return null;
                    const labelName = dataLabel;
                    const programLines = EditorUtils.getSectionCodeLines(model.getValue(), 'data');
                    const labelLineNumber = programLines.findIndex((line: string) => line.trim().startsWith(labelName + ':')) + EditorUtils.dataSectionLineIndex;
                    const labelLine = model.getLineContent(labelLineNumber + 1);
                    console.log(programLines, labelName, labelLine);

                    const column = labelLine.indexOf(labelName) + 1;

                    if (labelLineNumber == -1) return null;
                    const range = new monaco.Range(labelLineNumber + 1, column, labelLineNumber + 1, column + labelName.length + 1);
                    return {
                        range: range,
                        text: labelName,
                        uri: model.uri,
                        targetUri: model.uri,
                        targetRange: range,
                        targetSelectionRange: range

                    };
                }
                if (operandType == 'LABEL') {
                    const labels = EditorUtils.getLabels(model.getValue());
                    const label = labels.find((label: string) => label.trim() == value.trim());
                    if (!label) return null;
                    const labelName = label;
                    const programLines = EditorUtils.getSectionCodeLines(model.getValue(), 'text');
                    const labelLineNumber = programLines.findIndex((line: string) => line.trim().startsWith(labelName + ':')) + EditorUtils.textSectionLineIndex;
                    const labelLine = model.getLineContent(labelLineNumber + 1);
                    const column = labelLine.indexOf(labelName) + 1;

                    if (labelLineNumber == -1) return null;
                    const range = new monaco.Range(labelLineNumber + 1, column, labelLineNumber + 1, column + labelName.length + 1);
                    return {
                        range: range,
                        text: labelName,
                        uri: model.uri,
                        targetUri: model.uri,
                        targetRange: range,
                        targetSelectionRange: range
                    };
                }
            }


            return null;
        }
    } as monaco.languages.DefinitionProvider;
}