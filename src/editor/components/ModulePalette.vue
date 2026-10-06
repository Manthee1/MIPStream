<script setup lang="ts">
import { computed } from 'vue';
import { NText, NScrollbar } from 'naive-ui';
import clsx from 'clsx';
import { getAllManifests } from '@/shared/manifestRegistry';
import {
  pendingPlacementTypeId,
  requestPlacement,
  requestCancelPlacement,
} from '../core/placement-bridge';

const paletteItems = getAllManifests().map((manifest) => ({
  id: manifest.typeId,
  label: manifest.label,
  icon: manifest.icon,
}));

/** Item class: pending placement gets a persistent accent highlight. */
const itemClass = (id: string) =>
  clsx(
    'p-4 flex flex-col items-center justify-center gap-2 border transition-colors group aspect-square select-none',
    pendingPlacementTypeId.value === id
      ? 'border-blue-500 bg-blue-500/10 cursor-pointer'
      : 'bg-element hover:bg-app cursor-pointer border-transparent hover:border-blue-500/50'
  );

/** Clicking the pending item again cancels placement (toggle). */
const handleItemClick = (id: string) => {
  if (pendingPlacementTypeId.value === id) {
    requestCancelPlacement();
    return;
  }
  requestPlacement(id);
};

const pendingLabel = computed(() => {
  const id = pendingPlacementTypeId.value;
  if (!id) return null;
  return paletteItems.find((item) => item.id === id)?.label ?? id;
});
</script>

<template>
  <div class="h-full flex flex-col bg-surface">
    <div
      v-if="pendingLabel"
      class="px-3 py-1.5 bg-blue-500/10 border-b border-blue-500/40 flex items-center gap-2"
    >
      <span class="w-1.5 h-1.5 bg-blue-500 animate-pulse shrink-0"></span>
      <n-text type="primary" class="text-[10px] uppercase tracking-wider font-bold truncate">
        Placing: {{ pendingLabel }}
      </n-text>
    </div>
    <n-scrollbar class="flex-1">
      <div class="p-2 grid grid-cols-3 gap-2">
        <div v-for="item in paletteItems" :key="item.id" :class="itemClass(item.id)"
          :title="item.label" @click="handleItemClick(item.id)">
          <div v-html="item.icon"
            class="w-10 h-10 text-blue-500 group-hover:scale-110 transition-transform flex items-center justify-center" />
          <n-text class="text-xs text-center font-medium line-clamp-2 leading-tight">{{ item.label }}</n-text>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<style scoped>
:deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
