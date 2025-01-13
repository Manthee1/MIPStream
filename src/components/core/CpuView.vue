<template>
    <Window title="CPU">
        <div class="cpu-view">
           <canvas id="cpu-diagram">
                
           </canvas>
        </div>
    </Window>
</template>

<script>
import Window from '@/components/common/Window.vue';
import { defineComponent } from 'vue';
import { cpuConfig, cpuLayout } from '../../assets/js/core/cpus/simple';
import { CPUDiagram } from '../../assets/js/core/diagram/CPUDiagram';
import { DiagramEditor } from '../../assets/js/core/diagram/plugins/DiagramEditor';
import MIPSCore from '../../assets/js/core/MIPSCore';
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
        const cpu = new MIPSCore(cpuConfig);
        console.log(cpu);

        
        const cpuDiagram = new CPUDiagram('#cpu-diagram', cpu.config, cpuLayout,[DiagramEditor]);
    },
    methods: {
      
    }
});
</script>

<style scoped>
.cpu-view {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    min-width: 300px;
}
</style>