<script setup lang="ts">
/** @format */

import { useStageVisualizer } from '@/composables/useStageVisualizer';
import FitText from './FitText.vue';

/**
 * Stage instruction visualizer bar (task -4978): one cell per configured
 * pipeline stage, left-to-right in stage order, showing which instruction
 * each stage is working on. Driven entirely by `useStageVisualizer`
 * (pipeline config + live engine sampling); hidden when the pipeline is
 * disabled or the architecture's display toggle is off.
 */
const { visible, cells } = useStageVisualizer();
</script>

<template>
  <div
    v-if="visible"
    class="shrink-0 flex border-b border-border-color bg-surface select-none"
  >
    <div
      v-for="cell in cells"
      :key="cell.stageId"
      class="flex-1 min-w-0 flex flex-col gap-0.5 px-2 py-1 border-r border-border-color last:border-r-0"
    >
      <div class="text-[9px] uppercase tracking-wider text-secondary truncate leading-3">
        {{ cell.stageName }}
      </div>
      <div class="h-4">
        <FitText v-if="cell.instruction !== null" :text="cell.instruction" />
      </div>
    </div>
  </div>
</template>
