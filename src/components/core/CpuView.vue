<template>
    <div>
        <div class="stages" ref="stages">
            <!-- render stage and the instruction of that stage -->
            <div class="stage" :class="{ ['stage-' + index]: true, 'flushed': isFlushed(index) }"
                v-for="(stagePC, index) in stagePCs" :key="index">
                <span v-if="stagePC == -1 || stagePC > $simulationStore.instructionCount"> nop</span>
                <span v-else :style="{ fontSize: getFontSize(program[$simulationStore.PCToLineMap[stagePC] - 1]) }">
                    {{ program[$simulationStore.PCToLineMap[stagePC] - 1] }}
                </span>
                <!-- <span>{{ $simulationStore.core.instructions[index] }}</span> -->
            </div>
        </div>
        <CpuDiagram :cpu="$simulationStore.core" :key="'cpud-' + cpuType"
            @diagramLoaded="$simulationStore.cpuDiagram = $event" />


    </div>
</template>

<script lang="ts">
import Window from '@/components/common/Window.vue';
import { defineComponent } from 'vue';
// import { cpuConfig, cpuLayout } from '../../assets/js/core/cpus/simple';
import { CPUDiagram } from '../../assets/js/core/diagram/CPUDiagram';
import { DiagramEditor } from '../../assets/js/core/diagram/plugins/DiagramEditor';
import MIPSBase from '../../assets/js/core/MIPSBase';
import { DiagramInteraction } from '../../assets/js/core/diagram/plugins/DiagramInteraction';
import { clone, getProgramLines } from '../../assets/js/utils';
import CpuDiagram from '../features/CpuDiagram.vue';
import cpuVariables from '../../assets/js/core/config/cpu-variables';
export default defineComponent({
    components: { Window, CpuDiagram },
    name: 'CpuView',
    data() {
        return {
            stageColors: ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff', '#f80', '#f08', '#8f0', '#80f', '#08f', '#0f8', '#f88', '#8f8', '#88f', '#ff8', '#f8f', '#8ff']
        };
    },
    created() {

    },
    computed: {
        program() {
            return getProgramLines(this.$simulationStore.loadedProgram);
        },
        stagePCs() {
            return this.$simulationStore.stagePCs;
        },
        cpuType() {
            return this.$simulationStore.cpuType;
        },
    },
    mounted() {
    },

    watch: {
        cpuType(value) {
            this.$simulationStore.cpuDiagram?.destroy();
        },
    },

    methods: {



        getColor(pc: number) {
            // If the isntruction is a nop, return a different color
            if (pc == -1) return '#888';
            if (this.program[this.$simulationStore.PCToLineMap[pc] - 1] == 'nop') return '#888';
            return this.stageColors[(pc) % this.stageColors.length];
        },

        getFontSize(text: string) {
            if (!text) return '1.5rem';
            // get stages element and find the first stage's width
            const stages = this.$refs.stages as HTMLElement;
            const stageWidth = (stages.querySelector('.stage')?.clientWidth || 100) - 20;
            // get the text width
            const textWidth = text.trim().length;
            const textHeightToWidthRatio = 15 / 9;

            // return the font size
            return Math.ceil(Math.min(15, (stageWidth / textWidth) * textHeightToWidthRatio)) / 10 + 'rem';

        },

        isFlushed(index: number) {
            if (this.$simulationStore.stagePCs[index] == -1) return true
            // check if the stage is flushed by comparing the assembled instructions vs the current instruction
            const activeStagesIntruction = [cpuVariables.IR_IF, cpuVariables.IR_ID, cpuVariables.IR_EX, cpuVariables.IR_MEM, cpuVariables.IR_WB];
            const activeStageInstruction = activeStagesIntruction[index].value;

            return activeStageInstruction == 0x0000003f;
        },

    }
});
</script>

<style lang='sass' scoped>
.stages
    display: flex
    justify-content: space-evenly
    align-items: center
    height: 100%
    min-width: 300px
    background-color: var(--color-surface-1)
    // border: 1px solid var(--color-regular)
    border-bottom: 0
    color: var(--color-regular)    
    & .stage
        --color: var(--color-regular)
        border: 2px solid var(--color-regular)
        flex: 1
        text-align: center
        line-height: 2rem
        font-size: 1.5rem
        border-color: var(--color)
        background-color: var(--color)
        color: var(--color-regular)
        font-family: var(--font-family-mono)

        &.stage-0
            --color: #FFD70030
        &.stage-1
            --color: #00FF0030
        &.stage-2
            --color: #fa807230
        &.stage-3
            --color: #87ceeb30
        &.stage-4
            --color: #ff69b430
        &.flushed
            background-color: var(--color-surface-2)
            border-color: var(--color-surface-3)
            color: var(--color-subtext)
    
.cpu-view 
    display: flex
    justify-content: center
    align-items: center
    height: 100%
    min-width: 300px

</style>