<script setup>

</script>

<template>
	<div>
		<div class="controls">
			<MButton v-if="status == 'stopped'" outlined small icon="play" @click="run" title="Run">
			</MButton>
			<MButton v-else-if="status == 'running'" outlined small icon="pause" @click="pause" title="Pause" />
			<MButton v-else-if="status == 'paused'" outlined small icon="play-circle" @click="resume" title="Resume" />
			<MButton outlined small icon="square" :disabled="status == 'stopped'" @click="stop" title="Stop"></MButton>
			<MButton outlined small icon="skip-forward" :disabled="status == 'stopped'" @click="step" title="Step">
			</MButton>
			<MButton outlined small icon="refresh-cw" @click="reloadProgram" title="Reload Program"></MButton>
			<span class="status-circle my-auto" :title="status" :class="'status-' + status"></span>
		</div>
		<div class="controls">
			<!-- <span>Speed:</span> -->
			<MRange v-model="$programExecutionStore.speed"></MRange>
			ins/s
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
			return this.$programExecutionStore.status
		}
	},
	methods: {
		resume() {
			this.$programExecutionStore.resume();
		},
		run() {
			this.$programExecutionStore.run();
		},
		pause() {
			this.$programExecutionStore.pause();
		},
		stop() {
			this.$programExecutionStore.stop();
		},
		step() {
			this.$programExecutionStore.step();
		},
		reloadProgram() {
			this.$programExecutionStore.loadProgram();
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