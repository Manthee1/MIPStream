<script setup lang="ts">
import { NText, NScrollbar } from 'naive-ui';
import { getAllManifests } from '@/shared/manifestRegistry';
import { requestPlacement } from '../core/placement-bridge';

const paletteItems = getAllManifests().map((manifest) => ({
  id: manifest.typeId,
  label: manifest.label,
  icon: manifest.icon,
}));
</script>

<template>
  <div class="h-full flex flex-col bg-surface">
    <n-scrollbar class="flex-1">
      <div class="p-2 grid grid-cols-3 gap-2">
        <div v-for="item in paletteItems" :key="item.id"
          class="p-4 bg-element hover:bg-app cursor-pointer select-none flex flex-col items-center justify-center gap-2 border border-transparent hover:border-blue-500/50 transition-colors group aspect-square"
          @click="requestPlacement(item.id)">
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
