<script setup>

</script>

<template>
	<div class="controls">
		<MButton v-if="$dlxStore.status == 'stopped'" outlined small icon="play" @click="run" title="Run"></MButton>
		<MButton v-else-if="$dlxStore.status == 'running'" outlined small icon="pause" @click="pause" title="Pause">
		</MButton>
		<MButton v-else-if="$dlxStore.status == 'paused'" outlined small icon="play-circle" @click="run" title="Resume">
		</MButton>
		<MButton outlined small icon="square" @click="stop" title="Stop"></MButton>
		<MButton outlined small icon="skip-forward" @click="step" title="Step"></MButton>
		<MButton outlined small icon="refresh-cw" @click="reloadProgram" title="Reload Program"></MButton>
		<span class="my-auto">Status: {{ $dlxStore.status }}</span>
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