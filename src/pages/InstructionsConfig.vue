<template>
    <div class="instructions-config">
        <div class="panel cpu-types">
            <h6>CPU Types</h6>
            <ul>
                <li v-for="(cpu, cpuKey) in cpuTypes" :key="cpuKey" @click="selectCpu(cpuKey)"
                    :class="{ 'selected': selectedCpu.name === cpu.name }">
                    <span>{{ cpu.name }}</span>
                    <p class="text-medium">{{ cpu.description }}</p>
                </li>
            </ul>
        </div>

        <div class="panel instructions">
            <h6>Instructions</h6>
            <input type="text" v-model="searchQuery" placeholder="Search instructions" />
            <ul>

                <label class="instruction-list-title text-center">Custom Instructions</label>
                <li v-if="filteredCustomInstructions.length" v-for="instruction in filteredCustomInstructions"
                    :key="instruction.mnemonic" @click="selectInstruction(instruction)"
                    :class="{ 'selected': selectedInstruction && selectedInstruction.mnemonic === instruction.mnemonic }">
                    <div class="flex">
                        <span class="my-auto">{{ instruction.mnemonic }} ({{ instruction.type }})</span>
                        <Dropdown :icon="'more-vertical'" :label="''" :items="[
                            { label: 'Duplicate', action: () => duplicateInstruction(instruction), type: 'item', icon: 'edit' },
                        ]">
                        </Dropdown>
                    </div>
                </li>
                <div class="flex" v-else>
                    <span class="text-medium text-center mt-4 mx-auto">No custom instructions found</span>
                </div>
                <br>
                <hr>
                <br>
                <label class="instruction-list-title">Default Instruction</label>
                <li v-if="filteredInstructions.length" v-for="instruction in filteredInstructions"
                    :key="instruction.mnemonic" @click="selectInstruction(instruction)"
                    :class="{ 'selected': selectedInstruction && selectedInstruction.mnemonic === instruction.mnemonic }">
                    <div class="flex">
                        <span class="my-auto">{{ instruction.mnemonic }} ({{ instruction.type }})</span>
                        <Dropdown :icon="'more-vertical'" :label="''" :items="[
                            { label: 'Duplicate', action: () => duplicateInstruction(instruction), type: 'item', icon: 'edit' },
                        ]">
                        </Dropdown>
                    </div>
                </li>
                <div class="flex" v-else>
                    <span class="text-medium text-center mt-4 mx-auto">No default instructions found</span>
                </div>
            </ul>
            <MButton accent filled icon="plus" @click="createInstruction" class="add-instruction-button">
                Add Instruction
            </MButton>
        </div>

        <div class="panel flex-auto">
            <template v-if="selectedInstruction">
                <div class="cpu-diagram-container flex-auto">
                    <CpuDiagram class="cpu-diagram" :cpu="cpuInstance" :key="'cpu-' + selectedCpu.name"
                        @diagramLoaded="cpuDiagramInstance = $event" />
                </div>
                <div class="instruction-config flex-auto">
                    <h5 class="font-bold">{{ selectedInstruction.mnemonic }}</h5>
                    {{ selectedInstruction.description }}
                    <div class="flex flex-row flex-nowrap gap-5 flex-top-left">
                        <div class="flex flex-row gap-2 flex-6 flex-top-left">
                            <div class="form-group flex-6">
                                <label>Opcode:</label>
                                <input type="number" class="input-small"
                                    :disabled="selectedInstruction.type == 'R' || !isCurrentInstructionCustom"
                                    v-model="selectedInstruction.opcode" />
                            </div>
                            <div class="form-group flex-2">
                                <label>Type:</label>
                                <MSelect compact :disabled="!isCurrentInstructionCustom" :options="[
                                    { label: 'R', value: 'R' },
                                    { label: 'I', value: 'I' },
                                    { label: 'J', value: 'J' },
                                ]" :value="selectedInstruction.type" v-model="selectedInstruction.type"
                                    @update:modelValue="(value) => {
                                        console.log('Selected Type:', value);

                                        if (!selectedInstruction) return;
                                        selectedInstruction.type = value;
                                        selectedInstruction.operands = getDefaultInstructionDefOperands(selectedInstruction);
                                    }" />
                            </div>
                            <div class="form-group flex-2">
                                <label>Function:</label>
                                <MSelect compact class="flex-auto" :options="functValues"
                                    :disabled="selectedInstruction.type != 'R' || !isCurrentInstructionCustom"
                                    :value="selectedInstruction.funct" v-model="selectedInstruction.funct" />
                            </div>

                            <div class="form-group flex-12">
                                <label>Operands:</label>
                                <div class="flex flex-row flex-nowrap gap-2 flex-left">
                                    <template v-for="(operand, operandIndex) in selectedInstruction?.operands"
                                        :key="operandIndex">
                                        <MSelect compact class="flex-auto" :disabled="!isCurrentInstructionCustom"
                                            v-if="selectedInstruction?.operands && (operandIndex < (selectedInstruction.type === 'R' ? 3 : selectedInstruction.type === 'I' ? 4 : 1))"
                                            :options="getAvailableOperands(selectedInstruction, selectedInstruction?.operands[operandIndex])"
                                            v-model="selectedInstruction.operands[operandIndex]" />
                                    </template>
                                </div>
                            </div>
                            <div class="form-group flex-12">
                                <span>{{ exampleInstruction }}</span>
                                <span>{{ getPseudoCode(selectedInstruction) }}</span>
                            </div>
                        </div>
                        <div class="flex flex-row gap-2 flex-6">
                            <div class="form-group flex flex-3 flex-grow-0"
                                v-for="(value, key) in cpuInstance.controlSignals" :key="key">
                                <label>{{ key }}:</label>
                                <MSelect :disabled="!isCurrentInstructionCustom" compact :options="new Array((2 ** value.bits)).fill(0).map((_, i) => {
                                    return {
                                        label: i.toString(2),
                                        value: i
                                    }
                                })" :value="selectedInstruction.controlSignals[key] ?? 0"
                                    v-model="selectedInstruction.controlSignals[key]" />
                            </div>
                        </div>
                    </div>
                </div>
            </template>
            <template v-else>
                <div class="flex flex-column gap-2">
                    <h6>Select an instruction to view its configuration</h6>
                    <p>Click on an instruction to view its configuration and control signals.</p>
                </div>
            </template>

        </div>
    </div>


</template>


<script lang="ts">
import { defineComponent } from 'vue';
import { CPUS } from '../assets/js/core/config/cpus';
import MIPSBase from '../assets/js/core/MIPSBase';
import MButton from '../components/common/MButton.vue';
import Dropdown from '../components/common/Dropdown.vue';
import { getDefaultInstructionDefOperands, getInstructionSyntax, getOperandSyntax, getPseudoCode } from '../assets/js/utils';
import MSelect from '../components/common/MSelect.vue';
import { ALUOperations, ALUOperationsSigns } from '../assets/js/core/config/alu';
import CpuView from '../components/core/CpuView.vue';
import { useSimulationStore } from '../stores/simulationStore';
import CpuDiagram from '../components/features/CpuDiagram.vue';
import { CPUDiagram } from '../assets/js/core/diagram/CPUDiagram';
import { Assembler } from '../assets/js/core/Assembler';
import { watch } from 'fs';


export default defineComponent({
    name: 'InstructionsConfig',
    components: {
        MButton,
        Dropdown,
        MSelect,
        CpuDiagram
    },
    data() {
        return {
            cpuTypes: CPUS,
            instructions: [] as InstructionConfig[],
            customInstructions: [] as InstructionConfig[],
            selectedCpu: CPUS.basic,
            cpuInstance: new MIPSBase(),
            cpuDiagramInstance: null as CPUDiagram | null,
            selectedInstruction: null as InstructionConfig | null,
            searchQuery: '',
            isCurrentInstructionCustom: false,
        };
    },
    mounted() {
        this.selectCpu('basic');
    },

    computed: {
        filteredInstructions() {
            return this.instructions.filter(instruction =>
                // Search both mnemonic and description
                instruction.mnemonic.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                instruction.type.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        },
        filteredCustomInstructions() {
            return this.customInstructions.filter(instruction =>
                // Search both mnemonic and description
                instruction.mnemonic.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                instruction.type.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        },
        functValues() {
            const functValues: { label: string; value: number }[] = [];
            const functKeys = Object.keys(ALUOperations);
            for (let i = 0; i < functKeys.length; i++) {
                const key = functKeys[i];

                functValues.push({
                    label: key + ` (${(ALUOperationsSigns as Record<string, string>)[key]})`,
                    value: (ALUOperations as Record<string, number>)[key],

                });

            }

            return functValues;
        },

        exampleInstruction() {
            return this.selectedInstruction ? getInstructionSyntax(this.selectedInstruction).replace('imm(Rs)', '4(R2)').replace('Rd', 'R1').replace('Rs', 'R2').replace('Rt', 'R3').replace('imm', '4').replace('-', '') : '';
        },
    },
    watch: {
        selectedInstruction() {
            if (!this.selectedInstruction) return;
            this.selectInstruction(this.selectedInstruction);
        }
    },
    methods: {
        selectCpu(cpu: string) {
            if (!this.cpuTypes[cpu]) {
                console.error(`CPU type ${cpu} not found`);
                return;
            }

            this.selectedCpu = this.cpuTypes[cpu];
            this.cpuDiagramInstance?.destroy();
            this.cpuInstance = new this.selectedCpu.cpu()
            this.instructions = this.cpuInstance.instructionConfig;

        },
        selectInstruction(instruction: InstructionConfig) {
            this.selectedInstruction = instruction;

            // Make sure the operand list is at least 4 long
            instruction.operands = instruction.operands ?? getDefaultInstructionDefOperands(instruction);
            for (let i = instruction.operands.length; i < 4; i++) {
                instruction.operands.push('NONE');
            }
            // Simulate 5 cycles of the instruction
            const instructionLine = getInstructionSyntax(instruction).replace('imm(Rs)', '4(R2)').replace('Rd', 'R1').replace('Rs', 'R2').replace('Rt', 'R3').replace('imm', '4').replace('-', '');
            const code = `${instructionLine}\n${instructionLine}\n${instructionLine}\n${instructionLine}\nlabel:`
            const assembler = new Assembler(this.instructions);
            const program = assembler.assemble(code).instructions;
            this.cpuInstance.reset();
            this.cpuInstance.loadProgram(program);
            this.cpuInstance.runCycle();
            this.cpuInstance.runCycle();
            this.cpuInstance.runCycle();
            this.cpuInstance.runCycle();
            this.cpuInstance.runCycle();
            this.cpuDiagramInstance?.draw();
        },

        createInstruction() {
            const newInstruction: InstructionConfig = {
                opcode: 0,
                mnemonic: `newinst${this.instructions.length + 1}`,
                type: 'R',
                description: 'New instruction',
                funct: 0,
                controlSignals: {},

            };
            this.instructions.push(newInstruction);
        },
        deleteInstruction(mnemonic: string) {

            this.instructions = this.instructions.filter(instruction => instruction.mnemonic !== mnemonic);
        },
        duplicateInstruction(instruction: InstructionConfig) {
            const newInstruction = { ...instruction, id: Date.now() };
            this.instructions.push(newInstruction);
        },
        getAvailableOperands(instruction: InstructionConfig, currentOperand: OperandType) {
            const operands = instruction.operands ?? getDefaultInstructionDefOperands(instruction);

            let availableOperands: OperandType[] = ['REG_DESTINATION',
                'REG_SOURCE',
                'REG_TARGET',
                'IMMEDIATE',
                'MEM_ADDRESS',
                'LABEL'
            ];

            const selectedOperands = new Set<OperandType>(operands.filter(operand => operand !== 'NONE' && operand !== currentOperand));

            // Remove some operands based on the instruction type
            if (instruction.type === 'R') {
                availableOperands.splice(availableOperands.indexOf('IMMEDIATE'), 1);
                availableOperands.splice(availableOperands.indexOf('MEM_ADDRESS'), 1);
                availableOperands.splice(availableOperands.indexOf('LABEL'), 1);
            } else if (instruction.type === 'I') {
                availableOperands.splice(availableOperands.indexOf('REG_DESTINATION'), 1);
            } else if (instruction.type === 'J') {
                availableOperands.splice(availableOperands.indexOf('REG_DESTINATION'), 1);
                availableOperands.splice(availableOperands.indexOf('REG_SOURCE'), 1);
                availableOperands.splice(availableOperands.indexOf('MEM_ADDRESS'), 1);
                availableOperands.splice(availableOperands.indexOf('REG_TARGET'), 1);
            }
            // Filter out operands that are already used
            availableOperands = availableOperands.filter((operand, index) => {
                if (selectedOperands.has(operand)) {
                    return false;
                }

                if ((operand == "REG_SOURCE" || operand == "MEM_ADDRESS") &&
                    (selectedOperands.has('REG_SOURCE') || selectedOperands.has('MEM_ADDRESS'))) {
                    return false;
                }

                if ((operand == "IMMEDIATE" || operand == "LABEL" || operand == "MEM_ADDRESS") &&
                    (selectedOperands.has('IMMEDIATE') || selectedOperands.has('LABEL') || selectedOperands.has('MEM_ADDRESS'))) {
                    return false;
                }

                return true;
            });

            availableOperands.push('NONE');


            return availableOperands.map(operand => {
                return {
                    label: getOperandSyntax(operand),
                    value: operand
                };
            });
        },
        getOperandSyntax,
        getPseudoCode,
        getDefaultInstructionDefOperands
    },
});
</script>


<style scoped lang="scss">
.instructions-config {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: row;
    gap: 20px;
    overflow: auto;

    .panel {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--color-medium);
        padding: 10px;
        border-radius: 5px;
        height: 100%;


        ul {
            list-style-type: none;
            padding: 0;
            overflow-y: auto;
            flex-grow: 1;
            margin: 2rem 0px;

            .instruction-list-title {
                position: sticky;
                top: 0;
                background-color: var(--color-background);
                font-weight: 600;
                margin: auto;
                padding: 0px;
                text-align: center;
                width: 100%;
                border-bottom: 1px solid var(--color-regular);

                // Add lines coming from left and right
                &::before,
                &::after {
                    content: '';
                    display: inline-block;
                    width: 30px;
                    height: 1px;
                    background-color: var(--color-regular);
                    margin: 0 10px;
                    vertical-align: middle;
                }

                &::before {
                    margin-right: 10px;
                }
            }

            li {
                cursor: pointer;
                padding: 0.5rem 1rem;
                // background-color: var(--color-light);
                font-weight: 600;

                border: 2px solid var(--color-light);

                border-radius: 5px;
                margin-bottom: 5px;

                &:last-child {
                    margin-bottom: 0;
                }

                p {
                    margin: 0;
                }

                &:hover {
                    background-color: var(--color-light);
                }

                &.selected {
                    background-color: var(--color-accent-background);
                    border-color: var(--color-accent);
                    color: var(--color-accent);

                    p {
                        color: var(--color-accent-light);
                    }
                }
            }
        }

        .actions {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;

            input {
                flex-grow: 1;
                margin-right: 10px;
            }
        }
    }
}




.instruction-config {
    background-color: var(--color-light);
    padding: 10px;
    border-radius: 5px;

    .form-group {
        display: flex;
        flex-flow: column nowrap;
        justify-content: center;
        align-content: center;
        gap: 5px;

        label {
            font-weight: 600;
            margin-bottom: 0px;
        }
    }
}

.cpu-diagram-container {
    background-color: var(--color-light);
    display: flex;
    padding: 10px;
    border-radius: 5px;
    // max-height: 50%;
    overflow: hidden;

    .cpu-diagram {
        height: 100%;
        width: unset !important;
        margin: auto;
        border-radius: 5px;
        border: 1px solid var(--color-regular);
        // aspect-ratio: 1;
    }
}
</style>