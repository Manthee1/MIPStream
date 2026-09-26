<script setup lang="ts">
import { ref } from 'vue';
import { IconArrowLeft, IconPlayerPlay, IconPlayerStop, IconPlayerSkipForward, IconSettings, IconDeviceFloppy, IconCpu } from '@tabler/icons-vue';
import { useRouter } from 'vue-router';
import { NLayout, NLayoutHeader, NLayoutContent, NSpace, NButton, NIcon, NText } from 'naive-ui';

const router = useRouter();
const perspective = ref<'design' | 'simulate'>('design');
</script>

<template>
  <n-layout class="h-screen flex flex-col bg-surface-1">
    <!-- Workspace Top Bar -->
    <n-layout-header bordered class="h-14 flex items-center justify-between px-4 shrink-0 bg-white dark:bg-surface-0">
      <n-space align="center" :size="16">
        <n-button quaternary circle @click="router.push('/')">
          <template #icon>
            <n-icon><IconArrowLeft /></n-icon>
          </template>
        </n-button>
        <div class="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
        <n-text strong class="text-sm tracking-tight">Untitled Architecture</n-text>
      </n-space>

      <div class="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
        <button 
          @click="perspective = 'design'"
          :class="['px-4 py-1.5 text-xs font-bold rounded-md transition-all', perspective === 'design' ? 'bg-white dark:bg-surface-2 shadow-sm shadow-slate-200 dark:shadow-black' : 'text-slate-500']"
        >
          Design
        </button>
        <button 
          @click="perspective = 'simulate'"
          :class="['px-4 py-1.5 text-xs font-bold rounded-md transition-all', perspective === 'simulate' ? 'bg-white dark:bg-surface-2 shadow-sm shadow-slate-200 dark:shadow-black' : 'text-slate-500']"
        >
          Simulate
        </button>
      </div>

      <n-space align="center" :size="8">
        <n-space :size="4" v-if="perspective === 'simulate'">
          <n-button quaternary circle type="success">
            <template #icon><n-icon><IconPlayerPlay /></n-icon></template>
          </n-button>
          <n-button quaternary circle disabled>
            <template #icon><n-icon><IconPlayerStop /></n-icon></template>
          </n-button>
          <n-button quaternary circle type="primary">
            <template #icon><n-icon><IconPlayerSkipForward /></n-icon></template>
          </n-button>
        </n-space>
        <n-button quaternary circle>
          <template #icon><n-icon><IconDeviceFloppy /></n-icon></template>
        </n-button>
        <n-button quaternary circle>
          <template #icon><n-icon><IconSettings /></n-icon></template>
        </n-button>
      </n-space>
    </n-layout-header>

    <!-- Workspace Main Area -->
    <n-layout-content class="flex-grow relative overflow-hidden bg-slate-50 dark:bg-slate-900/50">
      <!-- Design Perspective Placeholder -->
      <div v-if="perspective === 'design'" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <div class="text-slate-300 dark:text-slate-800 mb-4 flex justify-center">
             <div class="border-2 border-dashed border-current rounded-3xl p-12">
               <n-icon size="64">
                 <IconCpu />
               </n-icon>
             </div>
          </div>
          <n-text depth="3" class="text-lg font-bold">Architecture Canvas Placeholder</n-text>
          <br />
          <n-text depth="3" class="text-sm">Drag modules from the palette to start designing</n-text>
        </div>
      </div>

      <!-- Simulate Perspective Placeholder -->
      <div v-else class="absolute inset-0 flex items-center justify-center">
         <n-text depth="3" class="text-lg font-bold">Simulation Perspective Placeholder</n-text>
      </div>
    </n-layout-content>
  </n-layout>
</template>

