<template>
    <div>
        <div class="stages">
            <!-- render stage and the instruction of that stage -->
            <div class="stage" :class="'stage-' + index" v-for="(stagePC, index) in stagePCs" :key="index">
                <span v-if="stagePC == -1"> nop</span>
                <span v-else>{{ program[$programExecutionStore.PCToLineMap[stagePC] - 1] }}</span>
                <!-- <span>{{ $programExecutionStore.core.instructions[index] }}</span> -->
            </div>
        </div>
        <div class="cpu-view">
            <canvas id="cpu-diagram"></canvas>
        </div>
    </div>
</template>

<script>
import Window from '@/components/common/Window.vue';
import { defineComponent } from 'vue';
// import { cpuConfig, cpuLayout } from '../../assets/js/core/cpus/simple';
import { CPUDiagram } from '../../assets/js/core/diagram/CPUDiagram';
import { DiagramEditor } from '../../assets/js/core/diagram/plugins/DiagramEditor';
import MIPSBase from '../../assets/js/core/MIPSBase';
import { DiagramInteraction } from '../../assets/js/core/diagram/plugins/DiagramInteraction';
import { clone, getProgramLines } from '../../assets/js/utils';
export default defineComponent({
    components: { Window },
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
            return getProgramLines(this.$programExecutionStore.loadedProgram);
        },
        stagePCs() {
            return this.$programExecutionStore.stagePCs;
        }
    },
    mounted() {
        const cpu = new MIPSBase();
        console.log(cpu);


        this.$viewStore.cpuDiagram = new CPUDiagram('#cpu-diagram', clone(cpu.cpuLayout), [DiagramInteraction]);
    },

    methods: {
        getColor(pc) {
            // If the isntruction is a nop, return a different color
            if (pc == -1) return '#888';
            if (this.program[this.$programExecutionStore.PCToLineMap[pc] - 1] == 'nop') return '#888';
            return this.stageColors[(pc) % this.stageColors.length];
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
    background-color: var(--color-light)
    border: 1px solid var(--color-regular)
    border-bottom: 0
    color: var(--color-regular)
    & .stage
        border-right: 1px solid var(--color-regular)
        flex: 1
        text-align: center
        &.stage-0
            border-color: #FFD70030
            background-color: #FFD70030
        &.stage-1
            border-color: #00FF0030
            background-color: #00FF0030
        &.stage-2
            border-color: #fa807230
            background-color: #fa807230
        &.stage-3
            border-color: #87ceeb30
            background-color: #87ceeb30
        &.stage-4
            border-color: #ff69b430
            background-color: #ff69b430
    

.theme-dark
    #cpu-diagram 
        filter: invert(1)
.cpu-view 
    display: flex
    justify-content: center
    align-items: center
    height: 100%
    min-width: 300px

    #cpu-diagram 
        border: 1px solid var(--color-regular)
        width: 100%

</style>