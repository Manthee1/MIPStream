<template>
    <div class="instructions-config">
        <div class="panel cpu-types">
            <h6>CPU Types</h6>
            <ul>
                <li v-for="(cpu, cpuKey) in cpuTypes" :key="cpuKey" @click="selectCpu(cpuKey)"
                    :class="{ 'selected': selectedCpuKey === cpuKey }">
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
                    :key="instruction.mnemonic" @click="selectInstruction(instruction, true)"
                    :class="{ 'selected': selectedInstruction && selectedInstruction.mnemonic === instruction.mnemonic }">
                    <div class="flex">
                        <span class="my-auto">{{ instruction.mnemonic }} ({{ instruction.type }})</span>
                        <Dropdown :icon="'more-vertical'" :label="''" :items="[
                            { label: 'Duplicate', action: () => duplicateInstruction(instruction), type: 'item', icon: 'edit' },
                            { label: 'Delete', action: () => invokeDelete(instruction.mnemonic), type: 'item', icon: 'trash' },
                            { label: 'Rename', action: () => invokeRename(instruction), type: 'item', icon: 'edit' },
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

        <div class="panel flex-auto gap-3">
            <template v-if="selectedInstruction">

                <div class="flex flex-left flex-nowrap gap-2 mb-2">
                    <h5 class="font-bold my-auto">
                        {{ selectedInstruction.mnemonic }}
                    </h5>
                    <span class="text-large my-auto">- {{ exampleInstruction }}
                    </span>
                    <MButton class="ml-auto" icon="edit" :disabled="!isCurrentInstructionCustom"
                        @click="invokeRename(selectedInstruction)" />
                </div>

                <textarea style="max-height: 200px; resize: vertical;" :disabled="!isCurrentInstructionCustom"
                    resize="none" v-model="selectedInstruction.description" placeholder="No Description"></textarea>
                <div class="cpu-diagram-container box flex-auto">
                    <CpuDiagram class="cpu-diagram" :cpu="cpuInstance" :key="'cpu-' + selectedCpu.name"
                        @diagramLoaded="cpuDiagramInstance = $event" />

                </div>

                <div class="flex-auto box flex flex-left gap-2">
                    <label class="m-0">Pseudo Code: </label>
                    <span>{{ getPseudoCode(selectedInstruction) }}</span>
                </div>

                <div class="instruction-config flex-auto box">
                    <div class="flex flex-row flex-nowrap gap-5 flex-top-left">
                        <div class="flex flex-row gap-2 flex-6 flex-top-left">
                            <div class="form-group flex-4">

                                <label class="flex gap-2">
                                    <span>Opcode:</span>
                                    <span class="my-auto mr-auto"
                                        v-if="customInstructions.find(inst => inst.opcode === selectedInstruction?.opcode && inst.mnemonic !== selectedInstruction.mnemonic) || instructions.find(inst => inst.opcode === selectedInstruction?.opcode && inst.mnemonic !== selectedInstruction.mnemonic)"
                                        title="Opcode already exists">
                                        <vue-feather :size="18" style="color: var(--color-system-warning);"
                                            type="alert-triangle" />
                                    </span>
                                </label>
                                <div class="flex flex-row flex-nowrap gap-2">
                                    <input type="number" class="input-small"
                                        :disabled="selectedInstruction.type == 'R' || !isCurrentInstructionCustom"
                                        v-model="selectedInstruction.opcode" />
                                </div>
                            </div>
                            <div class="form-group flex-4">
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
                            <div class="form-group flex-4">
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
import { defineComponent, markRaw, toRaw } from 'vue';
import { CPUS } from '../assets/js/core/config/cpus';
import MIPSBase from '../assets/js/core/MIPSBase';
import MButton from '../components/common/MButton.vue';
import Dropdown from '../components/common/Dropdown.vue';
import { clone, getDefaultInstructionDefOperands, getInstructionSyntax, getOperandSyntax, getPseudoCode } from '../assets/js/utils';
import MSelect from '../components/common/MSelect.vue';
import { ALUOperations, ALUOperationsSigns } from '../assets/js/core/config/alu';
import CpuView from '../components/core/CpuView.vue';
import { useSimulationStore } from '../stores/simulationStore';
import CpuDiagram from '../components/features/CpuDiagram.vue';
import { CPUDiagram } from '../assets/js/core/diagram/CPUDiagram';
import { Assembler } from '../assets/js/core/Assembler';
import { watch } from 'fs';
import { deleteInstruction, getInstruction, getInstructionByMnemonic, getInstructions, insertInstruction, Instruction, updateInstruction } from '../services/instructionsService';


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
            instructions: [] as Instruction[],
            customInstructions: [] as Instruction[],
            selectedCpu: CPUS.basic,
            selectedCpuKey: 'basic',
            cpuInstance: new MIPSBase(),
            cpuDiagramInstance: null as CPUDiagram | null,
            selectedInstruction: null as Instruction | null,
            searchQuery: '',
            isCurrentInstructionCustom: false,

            updateTimeout: null as NodeJS.Timeout | null,
        };
    },
    async mounted() {
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
        "selectedInstruction": {
            handler(newValue, oldValue) {
                if (oldValue?.mnemonic == newValue?.mnemonic && this.isCurrentInstructionCustom) {
                    // Save the instruction to the instructions table
                    const instruction = this.customInstructions.find(inst => inst.mnemonic === newValue?.mnemonic);
                    console.log('Updating instruction:', instruction);

                    if (!instruction) return;
                    // Clear the previous timeout
                    if (this.updateTimeout) {
                        clearTimeout(this.updateTimeout);
                    }
                    // Set a new timeout to update the instruction
                    this.updateTimeout = setTimeout(() => {
                        // Update the instruction in the database
                        updateInstruction(toRaw(instruction));
                        this.$notify({
                            title: 'Instruction Updated',
                            text: `Instruction ${instruction.mnemonic} updated successfully`,
                            type: 'success',
                        })
                    }, 1000);


                }
            },
            immediate: true,
            deep: true,
        },

    },
    methods: {
        async selectCpu(cpu: string) {
            if (!this.cpuTypes[cpu]) {
                console.error(`CPU type ${cpu} not found`);
                return;
            }

            this.selectedCpu = this.cpuTypes[cpu];
            this.selectedCpuKey = cpu;
            console.log('Selected CPU:', this.selectedCpuKey);

            this.cpuDiagramInstance?.destroy();
            this.cpuInstance = new this.selectedCpu.cpu()
            this.instructions = this.cpuInstance.instructionConfig.map(instruction => {
                return {
                    ...instruction,
                    cpuType: cpu,
                    id: 0,
                };
            });
            this.customInstructions = await getInstructions(999, {
                cpuType: cpu,
            });

        },
        selectInstruction(instruction: Instruction, isCustom = false) {
            this.selectedInstruction = instruction;
            this.isCurrentInstructionCustom = isCustom;
            // Make sure the operand list is at least 4 long
            instruction.operands = instruction.operands ?? getDefaultInstructionDefOperands(instruction);
            for (let i = instruction.operands.length; i < 4; i++) {
                instruction.operands.push('NONE');
            }
            // Simulate 5 cycles of the instruction
            const instructionLine = getInstructionSyntax(instruction).replace('imm(Rs)', '4(R2)').replace('Rd', 'R1').replace('Rs', 'R2').replace('Rt', 'R3').replace('imm', '4').replace('-', '');
            const code = `${instructionLine}\n${instructionLine}\n${instructionLine}\n${instructionLine}\n${instructionLine}\nlabel:`
            const assembler = new Assembler([...this.instructions, ...this.customInstructions]);
            const program = assembler.assemble(code).instructions;
            this.cpuInstance.reset();
            this.cpuInstance.loadProgram(program);
            this.cpuInstance.runCycle();
            this.cpuInstance.runCycle();
            this.cpuInstance.runCycle();
            this.cpuInstance.runCycle();
            this.cpuDiagramInstance?.draw();
        },

        async createInstruction() {
            let newMnemonic = `newinst1`;
            let i = 1;
            while (this.customInstructions.find(inst => inst.mnemonic === newMnemonic)) {
                newMnemonic = `newinst${i}`;
                i++;
            }

            let newInstruction: Instruction = {
                id: 0, // Auto incremented by the database
                cpuType: this.selectedCpuKey,
                opcode: 0,
                mnemonic: newMnemonic,
                type: 'R',
                description: 'New instruction',
                funct: 0,
                controlSignals: {},
                operands: getDefaultInstructionDefOperands({ type: 'R', } as InstructionConfig),

            };
            newInstruction = await insertInstruction(newInstruction);
            this.customInstructions.push(newInstruction);
            this.selectInstruction(newInstruction, true);
            this.isCurrentInstructionCustom = true;
        },
        async deleteInstruction(mnemonic: string) {

            const instruction = this.customInstructions.find(instruction => instruction.mnemonic === mnemonic);
            if (!instruction) return;
            await deleteInstruction(instruction.id);
            this.customInstructions = this.customInstructions.filter(instruction => instruction.mnemonic !== mnemonic);
        },
        async duplicateInstruction(instruction: Instruction) {
            let newMnemonic = `${instruction.mnemonic}_copy`;
            let i = 1;
            while (this.customInstructions.find(inst => inst.mnemonic === newMnemonic)) {
                newMnemonic = `${instruction.mnemonic}_copy${i}`;
                i++;
            }
            // Create a new instruction with the same properties as the original
            let newInstruction: Instruction = {
                ...instruction,
                mnemonic: newMnemonic,
                id: 0, // Auto incremented by the database
                cpuType: this.selectedCpuKey,
            };

            newInstruction = await insertInstruction(clone(newInstruction));

            this.customInstructions.push(newInstruction);
            this.selectInstruction(newInstruction, true);

        },
        async invokeRename(instruction: Instruction) {
            // Open a prompt to rename the instruction
            const newMnemonic = await this.$prompt({
                title: 'Rename Instruction',
                message: 'Enter new mnemonic for instruction',
                input: instruction.mnemonic,
                inputPlaceholder: 'New mnemonic',
                verifyInput: (input) => {
                    if (!input) {
                        throw 'Mnemonic cannot be empty';
                    }

                    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input)) {
                        throw 'Mnemonic must start with a letter or underscore and can only contain letters, numbers, and underscores';
                    }

                    if (input == instruction.mnemonic) {
                        return true;
                    }

                    if (this.instructions.find(inst => inst.mnemonic === input) || this.customInstructions.find(inst => inst.mnemonic === input)) {
                        throw 'Mnemonic already exists';
                    }
                    return true;
                },
            })

            if (!newMnemonic) return;
            instruction.mnemonic = newMnemonic as string;
            if (instruction) {
                updateInstruction(toRaw(instruction));
            }

        },
        async invokeDelete(mnemonic: string) {
            // Open a confirmation dialog
            const confirmed = await this.$confirm({
                title: 'Delete Instruction',
                message: `Are you sure you want to delete the instruction "${mnemonic}"?`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
            });

            if (confirmed) {
                this.deleteInstruction(mnemonic);
            }
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
        border: 1px solid var(--color-surface-3);
        padding: 10px;
        border-radius: 5px;
        height: 100%;
        min-width: 200px;

        &.instructions {
            min-width: 400px;
            width: 25%
        }

        &.cpu-types {
            min-width: 200px;
            width: 20%;
        }

        .box {
            background-color: var(--color-surface-1);
            padding: 10px;
            border-radius: 5px;
        }

        ul {
            list-style-type: none;
            padding: 0;
            overflow-y: auto;
            flex-grow: 1;
            margin: 2rem 0px;

            .instruction-list-title {
                position: sticky;
                top: 0;
                background-color: var(--color-surface-0);
                font-weight: 600;
                margin: auto;
                margin-bottom: 1rem;
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
                // background-color: var(--color-surface-1);
                font-weight: 600;

                border: 2px solid var(--color-surface-1);

                border-radius: 5px;
                margin-bottom: 5px;

                &:last-child {
                    margin-bottom: 0;
                }

                p {
                    margin: 0;
                }

                &:hover {
                    background-color: var(--color-surface-1);
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
    display: flex;
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