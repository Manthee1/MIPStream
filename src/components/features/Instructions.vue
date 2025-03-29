<template>
    <div class="instructions">
        <input v-model="searchQuery" placeholder="Search instructions..." />
        <div class="text-center" v-if="filteredInstructions.length === 0">
            No instructions match the search query
        </div>
        <ul class="flex flex-column flex-nowrap gap-2">
            <li v-for="instruction in filteredInstructions" :key="instruction.opcode">
                <div class="flex flex-row flex-top-left gap-3">
                    <!-- Custom icon depending on instruction type -->

                    <vue-feather :type="getIcon(instruction)"></vue-feather>
                    <div class="flex flex-column flex-left gap-2">
                        <div class="flex flex-row flex-left width-full gap-2">

                            <label for="">{{ instruction.mnemonic }}</label> - <span>{{
                                getInstructionSyntax(instruction) }}</span>
                        </div>
                        <p class="width-full text-medium">
                            {{ getPseudoCode(instruction) }}
                        </p>
                        <p class="width-full text-medium" v-if="instruction.description">
                            {{ instruction.description }}
                        </p>
                    </div>
                </div>
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { getDefaultInstructionDefOperands, getInstructionSyntax } from '../../assets/js/utils';
import { get } from 'http';
import { ALUOperationstoSigns, getAluControl } from '../../assets/js/core/config/alu';

export default defineComponent({
    data() {
        return {
            searchQuery: '',
        };
    },
    computed: {
        instructions() {
            return this.$simulationStore.core.instructionConfig;
        },
        filteredInstructions() {
            return this.instructions.filter(instruction =>
                instruction.mnemonic.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                (instruction.description && instruction.description.toLowerCase().includes(this.searchQuery.toLowerCase()))
            );
        },
    },
    methods: {
        getIcon(instructionConfig: InstructionConfig) {
            if (instructionConfig.mnemonic == 'halt') return 'x-circle'
            if (instructionConfig.mnemonic == 'nop') return 'circle'

            if (instructionConfig.controlSignals) {
                const cs = instructionConfig.controlSignals as Record<string, number>;
                if (cs['MemWrite'] || cs['MemRead']) return 'cpu'
                if (cs['Branch']) return 'git-branch'
            }
            return 'grid'
        },
        getPseudoCode(instructionConfig: InstructionConfig) {
            // Construct the pseudo code based on the instruction config
            if (instructionConfig.mnemonic == 'halt') return '-'
            if (instructionConfig.mnemonic == 'nop') return '-'

            let out = ''
            const cs = instructionConfig.controlSignals as Record<string, number>;
            const ALUControl = getAluControl(cs['ALUOp'] ?? 0, instructionConfig?.funct ?? 0)
            let ALUOPSign = ALUOperationstoSigns[ALUControl] ?? '???'
            const operands = instructionConfig.operands ?? getDefaultInstructionDefOperands(instructionConfig);

            const Rs = (operands.includes('REG_SOURCE') || operands.includes('MEM_ADDRESS')) ? 'Rs' : ''
            const Rt = (operands.includes('REG_TARGET')) ? 'Rt' : ''

            const ALUIn2 = cs['ALUSrc'] ? 'imm' : 'Rt';

            if (cs['RegWrite']) {
                const memOut = cs['MemRead'] ? `MEM[${Rs} ${ALUOPSign} ${ALUIn2}]` : '0'
                out += `Rd = `
                out += (cs['MemtoReg']) ? memOut : `${Rs} ${ALUOPSign} ${ALUIn2}`;
            }

            if (cs['MemWrite']) {
                out += `MEM[${Rs} ${ALUOPSign} ${ALUIn2}] = Rd;`
            }

            if (cs['Branch']) {
                out += `if (${Rs} ${ALUOPSign} Rt == 0) PC = label`
            }
            return out;

        },
        getInstructionSyntax,
    },
});
</script>

<style scoped lang="scss">
.instructions {
    padding: 1rem;
    height: 100%;

    input {
        margin: 0 1rem;
        margin-bottom: 10px;
        padding: 5px;
        width: calc(100% - 2rem);
    }

    ul {
        list-style-type: none;
        padding: 0 1rem;
        overflow-y: auto;
        max-height: 100%;
        padding-bottom: 6rem;

        li {
            border: 1px solid var(--color-regular);
            border-radius: 5px;
            padding: 10px;

            label {
                margin: 0px;
            }

            p {
                margin: 0px;
            }

            &:hover {
                background-color: var(--color-light);
            }
        }
    }


}
</style>