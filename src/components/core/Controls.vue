<script setup>

</script>

<template>
	<div class="controls">
		<MButton v-if="$cpuStore.status == 'stopped'" outlined small icon="play" @click="run" title="Run"></MButton>
		<MButton v-else-if="$cpuStore.status == 'running'" outlined small icon="pause" @click="pause" title="Pause" />
		<MButton v-else-if="$cpuStore.status == 'paused'" outlined small icon="play-circle" @click="resume" title="Resume" />
		<MButton outlined small icon="square" @click="stop" title="Stop"></MButton>
		<MButton outlined small icon="skip-forward" @click="step" title="Step"></MButton>
		<MButton outlined small icon="refresh-cw" @click="reloadProgram" title="Reload Program"></MButton>
		<span class="my-auto">Status: {{ $cpuStore.status }}</span>
	</div>
</template>

<script>
import { defineComponent } from "vue";
import MButton from "@/components/common/MButton.vue";


export default defineComponent({

	name: 'Controls',
	components: {
		MButton
	},
	methods: {
		resume() {
			this.$cpuStore.resume();
		},
		run() {
			this.$cpuStore.run();
		},
		pause() {
			this.$cpuStore.pause();
		},
		stop() {
			this.$cpuStore.stop();
		},
		step() {
			this.$cpuStore.step();
		},
		reloadProgram() {
			this.$cpuStore.loadProgram();
		}
	}
});
</script>

<style scoped>
.controls {
	display: flex;
	gap: 10px;
	padding: 10px;
	flex: 0;
}

button {
	padding: 10px 20px;
	cursor: pointer;
}
</style>