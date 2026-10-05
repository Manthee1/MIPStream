<script setup lang="ts">
import { NText } from 'naive-ui';
import { ViewportState } from '../core/types';

defineProps<{
  viewport: ViewportState;
}>();
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
    </div>
    <div>
      <n-text depth="3" class="text-[10px] uppercase tracking-wider font-bold">
        Zoom: {{ Math.round(viewport.zoom * 100) }}%
      </n-text>
    </div>
  </div>
</template>
