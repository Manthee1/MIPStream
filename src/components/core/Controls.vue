<script setup>

</script>

<template>
	<div class="flex flex-row flex-wrap">
		<div class="controls">
			<MButton v-if="status == 'stopped'" outlined small icon="play" @click="run" title="Run (F5)">
			</MButton>
			<MButton v-else-if="status == 'running'" outlined small icon="pause" @click="pause" title="Pause (F8)" />
			<MButton v-else-if="status == 'paused'" outlined small icon="play-circle" @click="resume"
				title="Resume (F8)" />
			<MButton outlined small icon="square" :disabled="status == 'stopped'" @click="stop"
				title="Stop (Shift + F5)"></MButton>
			<MButton outlined small icon="skip-forward" :disabled="status == 'stopped'" @click="step" title="Step(F9)">
			</MButton>
			<MButton outlined small icon="refresh-cw" @click="reloadProgram" title="Reload Program"></MButton>
			<span class="status-circle my-auto" :title="status" :class="'status-' + status"></span>

		</div>
		<div class="flex gap-1 ml-3">
			<MRange v-model="$simulationStore.speed"></MRange>
			<span style="width:7ch" class="m-auto">{{ $simulationStore.speed }} ins/s</span>
		</div>
	</div>
</template>

<script>
import { defineComponent } from "vue";
import MButton from "@/components/common/MButton.vue";
import MRange from "../common/MRange.vue";


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