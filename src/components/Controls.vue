<script setup>

</script>

<template>
    <div class="controls">
        <button class="button-filled" @click="run">Run</button>
        <button class="button-filled" @click="pause">Pause</button>
        <button class="button-filled" @click="stop">Stop</button>
        <button class="button-filled" @click="step">Step</button>
        <button class="button-filled" @click="reloadProgram">Reload Program</button>
        <span>Status: {{ $dlxStore.status }}</span>
    </div>
</template>

<script>



export default {

    name: 'Controls',
    components: {
    },
    methods: {
        run() {
            console.log('Run clicked');
            this.$dlxStore.run();
            // Add your run logic here
        },
        pause() {
            console.log('Pause clicked');
            this.$dlxStore.pause();
            // Add your pause logic here
        },
        stop() {
            console.log('Stop clicked');
            this.$dlxStore.stop();
            // Add your stop logic here
        },
        step() {
            console.log('Step clicked');
            this.$dlxStore.step();
            // Add your step logic here
        },
        reloadProgram() {
            console.log('Reload Program clicked');
            this.$dlxStore.loadProgram();
            // Add your reload program logic here
        }
    }
}
</script>

<style scoped>
.controls {
    display: flex;
    gap: 10px;
    flex: 1 1 auto;
}

button {
    padding: 10px 20px;
    cursor: pointer;
}
</style>