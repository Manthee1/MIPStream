<template>
    <Window title="CPU">
        <div class="cpu-view">
            <canvas id="cpu-diagram"></canvas>
        </div>
    </Window>
</template>

<script>
import Window from '@/components/common/Window.vue';
import { defineComponent } from 'vue';
// import { cpuConfig, cpuLayout } from '../../assets/js/core/cpus/simple';
import { CPUDiagram } from '../../assets/js/core/diagram/CPUDiagram';
import { DiagramEditor } from '../../assets/js/core/diagram/plugins/DiagramEditor';
import MIPSBase from '../../assets/js/core/MIPSBase';
import { DiagramInteraction } from '../../assets/js/core/diagram/plugins/DiagramInteraction';
export default defineComponent({
    components: { Window },
    name: 'CpuView',
    data() {
        return {

        };
    },
    created() {

    },
    mounted() {
        const cpu = new MIPSBase();
        console.log(cpu);


        this.$viewStore.cpuDiagram = new CPUDiagram('#cpu-diagram', cpu.cpuLayout, [DiagramInteraction]);
    },
    methods: {

    }
});
</script>

<style lang='sass' scoped>
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
        border: 2px solid #000
        width: 100%

</style>