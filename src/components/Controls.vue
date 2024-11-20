<script setup>

</script>

<template>
    <div class="controls">
        <button class="button-filled" @click="run">
            <span>Run</span>
        </button>
        <button class="button-filled" @click="pause">
            Pause</button>
        <button class="button-filled" @click="stop">
            Stop</button>
        <button class="button-filled" @click="step">
            Step</button>

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
            // Add your run logic here
        },
        pause() {
            console.log('Pause clicked');
            // Add your pause logic here
        },
        stop() {
            console.log('Stop clicked');
            // Add your stop logic here
        },
        step() {
            console.log('Step clicked');
            // Add your step logic here
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