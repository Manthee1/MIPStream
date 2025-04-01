<template>
    <canvas id="cpu-diagram"></canvas>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { CPUDiagram } from '../../assets/js/core/diagram/CPUDiagram';
import { DiagramInteraction } from '../../assets/js/core/diagram/plugins/DiagramInteraction';


export default defineComponent({
    name: 'CpuDiagram',
    props: {
        cpu: {
            type: Object,
            required: true
        }
    },
    mounted() {
        this.mountDiagram();
    },
    methods: {
        mountDiagram() {
            const cpu = this.cpu;
            const cpuDiagram = new CPUDiagram('#cpu-diagram', cpu.cpuLayout, [DiagramInteraction]);
            // Emit even of diagram loaded
            this.$emit('diagramLoaded', cpuDiagram);
        }
    }
})

</script>

<style scoped lang="scss">
.theme-dark {
    #cpu-diagram {
        filter: invert(1);
    }
}

#cpu-diagram {
    border: 1px solid var(--color-regular);
    width: 100%;
}
</style>