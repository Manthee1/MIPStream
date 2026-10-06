<script setup lang="ts">
import { computed } from 'vue';
import { NText } from 'naive-ui';
import { ViewportState, PlacementState } from '../core/types';
import { getManifest } from '@/shared/manifestRegistry';

const props = defineProps<{
  viewport: ViewportState;
  placement: PlacementState | null;
  routing: boolean;
}>();

/** Human-readable label of the module currently being placed. */
const placementLabel = computed(() => {
  if (!props.placement) return null;
  return getManifest(props.placement.typeId)?.label ?? props.placement.typeId;
});
</script>

<template>
  <div class="absolute bottom-0 left-0 right-0 h-6 bg-surface border-t border-border-color px-3 flex items-center justify-between z-10">
    <div class="flex gap-4">
      <n-text depth="3" class="text-[10px] uppercase tracking-wider font-bold">
        X: {{ Math.round(viewport.x) }}
      </n-text>
      <n-text depth="3" class="text-[10px] uppercase tracking-wider font-bold">
        Y: {{ Math.round(viewport.y) }}
      </n-text>
      <n-text v-if="placementLabel" type="primary" class="text-[10px] uppercase tracking-wider font-bold">
        Placing: {{ placementLabel }} — R: rotate · Esc: cancel
      </n-text>
      <n-text v-else-if="routing" type="primary" class="text-[10px] uppercase tracking-wider font-bold">
        Routing net — click a port to connect · Esc: cancel
      </n-text>
    </div>
    <div>
      <n-text depth="3" class="text-[10px] uppercase tracking-wider font-bold">
        Zoom: {{ Math.round(viewport.zoom * 100) }}%
      </n-text>
    </div>
  </div>
</template>
