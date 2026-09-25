<script setup>

</script>

<template>
	<div class="flex flex-row flex-wrap">
		<div class="controls">
			<MButton outlined small icon="code" @click="reloadProgram" title="Assemble and load (F6)" />
			<div class="my-auto vert-line"></div>
			<MButton :disabled="$simulationStore.loadedProgram == '' || status == 'running'" outlined small icon="play"
				@click="run" title="Run from start (F5)" />
			<MButton v-if="status != 'paused'" :disabled="status == 'stopped'" outlined small icon="pause"
				@click="pause" title="Pause (F8)" />
			<MButton v-else-if="status == 'paused'" outlined small icon="play-circle" @click="resume"
				title="Resume (F8)" />
			<MButton outlined small icon="square" :disabled="status == 'stopped'" @click="stop"
				title="Stop (Shift + F5)" />
			<MButton outlined small icon="skip-forward" :disabled="status != 'paused'" @click="step"
				title="Step (F9)" />
			<span class="status-circle my-auto" :title="status" :class="'status-' + status"></span>

		</div>
		<div class="flex gap-1 mx-3">
			<MRange :modelValue="$simulationStore.speed" @update:modelValue="$simulationStore.setSpeed($event)" :min="1"
				:max="100" :step="1" />
			<span style="width:7ch" class="m-auto">{{ $simulationStore.speed < 100 ? $simulationStore.speed : 'ꝏ' }}
					ins/s</span>
		</div>
	</div>
</template>

<script>
import { defineComponent } from "vue";
import MButton from "@/components/common/MButton.vue";
import MRange from "../../common/MRange.vue";


export default defineComponent({

	name: 'Controls',
	components: {
		MButton,
		MRange
	},
	computed: {
		status() {
			return this.$simulationStore.status
		}
	},
	methods: {
		resume() {
			this.$simulationStore.resume();
		},
		run() {
			this.$simulationStore.run();
		},
		pause() {
			this.$simulationStore.pause();
		},
		stop() {
			this.$simulationStore.stop();
		},
		step() {
			this.$simulationStore.step();
		},
		reloadProgram() {
			this.$simulationStore.loadProgram();
		}
	}
});
</script>

<style scoped lang="scss">
.controls {
	display: flex;
	gap: 10px;
	padding: 10px;
	flex: 0;

	.vert-line {
		width: 2px;
		height: 2rem;
		background-color: var(--color-subtext);
		margin: auto 0rem;
	}

	.status-circle {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background-color: grey;

		&.status-running {
			background-color: var(--color-system-success);
		}

		&.status-paused {
			background-color: var(--color-system-warning);
		}

		&.status-stopped {
			background-color: var(--color-system-error);
		}
	}
}

button {
	padding: 10px 20px;
	cursor: pointer;
}
</style>