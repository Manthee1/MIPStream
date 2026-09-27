<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NLayout, NLayoutContent, NText, useMessage } from 'naive-ui';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/UIStore';

const router = useRouter();
const message = useMessage();
const projectStore = useProjectStore();
const uiStore = useUIStore();

onMounted(() => {
  if (!projectStore.currentProject) {
    message.warning('No project loaded. Redirecting to home...');
    router.push('/');
  }
});
</script>

<template>
  <n-layout class="h-full flex flex-col bg-surface-1">
    <n-layout-content class="flex-grow relative overflow-hidden bg-slate-50 dark:bg-slate-900/50">
      <div v-if="uiStore.perspective === 'design'" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <div class="text-slate-300 dark:text-slate-800 mb-4 flex justify-center">
             <div class="border-2 border-dashed border-current rounded-3xl p-12">
               <img src="/logo.svg" class="w-16 h-16 opacity-20 grayscale" alt="Logo" />
             </div>
          </div>
          <n-text depth="3" class="text-lg font-bold">Architecture Canvas Placeholder</n-text>
          <br />
          <n-text depth="3" class="text-sm">Drag modules from the palette to start designing</n-text>
        </div>
      </div>
      <div v-else class="absolute inset-0 flex items-center justify-center">
         <n-text depth="3" class="text-lg font-bold">Simulation Perspective Placeholder</n-text>
      </div>
    </n-layout-content>
  </n-layout>
</template>

