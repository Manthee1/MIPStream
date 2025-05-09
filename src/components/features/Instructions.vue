<template>
    <div class="instructions">
        <input v-model="searchQuery" placeholder="Search instructions..." />
        <div class="text-center" v-if="filteredInstructions.length === 0">
            No instructions match the search query
        </div>
        <ul class="flex flex-column flex-nowrap gap-2">
            <li v-for="instruction in filteredInstructions" :key="instruction.opcode">
                <div class="flex flex-row flex-nowrap flex-top-left gap-3">
                    <!-- Custom icon depending on instruction type -->

                    <vue-feather :size="24" style="min-width:24px" :type="getIcon(instruction)"></vue-feather>
                    <div class="flex flex-column flex-left gap-2 flex-auto">
                        <div class="flex flex-row flex-left width-full gap-2">

                            <label for="">{{ instruction.mnemonic }}</label> - <span>{{
                                getInstructionSyntax(instruction) }}</span>
                            <span class="instruction-type">{{ instruction.type }}</span>
                        </div>
                        <p class="width-full text-medium">
                            {{ getPseudoCode(instruction) }}
                        </p>
                        <p class="width-full text-medium text-justify" v-if="instruction.description">
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
import { getDefaultInstructionDefOperands, getInstructionSyntax, getPseudoCode } from '../../assets/js/utils';
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
        getPseudoCode,
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

            .instruction-type {
                font-size: 1.5rem;
                color: var(--color-surface-4);
                margin-left: auto;
                margin-right: 1rem;
            }

            p {
                margin: 0px;
            }

            &:hover {
                background-color: var(--color-surface-1);
            }
        }
    }


}
</style>