<script setup lang="ts">
import { decToHex } from '../../assets/js/utils';
</script>

<template>
    <div class="hex-view">
        <table class="hex-table">
            <thead>
                <tr>
                    <th>Address</th>
                    <th>Hex</th>
                    <th>Code</th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="$simulationStore.instructionMemory.length === 0">
                    <td colspan="3" class="text-center">No instructions loaded</td>
                </tr>
                <tr v-for="(instruction, index) in formattedInstructionMemory" :key="index"
                    :class="instruction.stage != -1 ? 'active-stage-' + instruction.stage : ''">
                    <td>{{ instruction.address }}</td>
                    <td>{{ instruction.hexValue }}</td>
                    <td>{{ instruction.lineNumber }}: {{ instruction.line }}</td>
                    <!-- <td>{{ instruction.stage }}</td> -->
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts">

export default {
    name: "HexView",

    computed: {

        instructionMemory() {
            const loadedProgram = this.$simulationStore.loadedProgram.split('\n');
            return Array.from(this.$simulationStore.instructionMemory).map((bytes: number, index) => {
                const address = index * 4;
                const hexValue = decToHex(bytes, 32);
                const opcode = bytes >>> 26
                const instructionConfig = this.$simulationStore.core.instructionConfig.find((instruction: any) => {
                    return instruction.opcode === opcode;
                });


                return {
                    address: `0x${decToHex(address, 16)}`,
                    hexValue: `0x${hexValue}`,
                    lineNumber: this.$simulationStore.PCToLineMap[index],
                    line: loadedProgram[this.$simulationStore.PCToLineMap[index] - 1].split(';')[0].trim(),
                };


            });
        },

        formattedInstructionMemory() {
            const instructions = this.instructionMemory.map((instruction) => {
                return {
                    ...instruction,
                    stage: -1,
                };
            });

            const stages = this.$simulationStore.stagePCs;
            for (let i = 0; i < stages.length; i++) {
                const stage = stages[i];
                if (stage !== -1 && instructions[stage]) {
                    instructions[stage].stage = i;
                }
            }
            return instructions;

        },
    },

    methods: {
        scrollToActiveStage() {
            const element = this.$el.querySelector(`.active-stage-0`) as HTMLElement;

            if (!element) return;
            element.scrollIntoView({ behavior: 'instant', block: 'center' });
        },
    },

    watch: {
        // watch stage pcs and scroll to the first stage
        "$simulationStore.stagePCs": {
            handler(newVal) {
                this.$nextTick(() => {
                    this.scrollToActiveStage();
                });
            },
            immediate: true,
            deep: true,
        },
    }
};
</script>

<style lang="scss" scoped>
.hex-view {
    display: flex;
    flex-flow: column nowrap;
    justify-content: flex-start;
    padding: 0px 1rem;
    align-content: center;
    width: 100%;
    height: 100%;
    overflow: auto;
    font-size: 1.2rem;

    table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        margin: 1rem 0px;

        th {

            padding: 0.5rem 0.3rem;
        }

        td {
            padding: 0.2rem 0.3rem;
            font-family: var(--font-family-mono);
        }

        thead tr {
            background-color: var(--color-surface-1);
            position: sticky;
            top: 0;
            z-index: 1;
        }

        tr {
            position: relative;
            border: 2px solid var(--color-surface-1);

            &::after {
                content: '';
                position: absolute;
                right: 0.3rem;
                vertical-align: middle;
                border-radius: 5px;
                padding: 0rem 0.5rem;
                margin: auto;
                margin-top: 3px;
            }


            &[class^="active-stage-"] {
                --stage-color: var(--color-surface-2);
                --stage-after-content: '';
                // background-color: var(--stage-color);
                border: 2px solid var(--stage-color);
                background-color: var(--stage-color);
                color: var(--color-regular);

                &::after {
                    content: var(--stage-after-content);
                    background-color: var(--stage-color);
                    border: 1px solid var(--stage-color);
                }

                &.active-stage-0 {
                    --stage-color: #FFD70030;
                    --stage-after-content: 'IF';
                }

                &.active-stage-1 {
                    --stage-color: #00FF0030;
                    --stage-after-content: 'ID';
                }

                &.active-stage-2 {
                    --stage-color: #fa807230;
                    --stage-after-content: 'EX';
                }

                &.active-stage-3 {
                    --stage-color: #87ceeb30;
                    --stage-after-content: 'MEM';
                }

                &.active-stage-4 {
                    --stage-color: #ff69b430;
                    --stage-after-content: 'WB';
                }
            }

        }


    }
}
</style>