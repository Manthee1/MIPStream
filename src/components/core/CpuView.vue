<template>
    <Window title="DLX CPU">
        <div class="cpu-view">
            <svg width="500" height="600">
                <!-- Example data paths -->
                <line v-for="path in dataPaths" :key="path.id" :x1="path.x1" :y1="path.y1" :x2="path.x2" :y2="path.y2"
                    :stroke="path.color" stroke-width="4" />
            </svg>
        </div>
    </Window>
</template>

<script>
import Window from '@/components/common/Window.vue';
export default {
    components: { Window },
    name: 'CpuView',
    data() {
        return {
            dataPaths: [
                { id: 1, x1: 100, y1: 100, x2: 300, y2: 100, color: 'black' },
                { id: 2, x1: 300, y1: 100, x2: 300, y2: 300, color: 'black' },
                { id: 3, x1: 300, y1: 300, x2: 100, y2: 300, color: 'black' },
                { id: 4, x1: 100, y1: 300, x2: 100, y2: 100, color: 'black' }
            ]
        };
    },
    methods: {
        updatePathColors(instruction) {
            // Logic to update path colors based on the current instruction
            this.dataPaths.forEach(path => {
                path.color = this.getColorForInstruction(instruction, path.id);
            });
        },
        getColorForInstruction(instruction, pathId) {
            // Example logic to determine color based on instruction and pathId
            if (instruction === 'LOAD' && pathId === 1) {
                return 'red';
            } else if (instruction === 'STORE' && pathId === 2) {
                return 'blue';
            }
            return 'black';
        }
    }
};
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