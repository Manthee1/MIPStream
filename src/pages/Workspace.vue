<script setup lang="ts">
import { ref } from 'vue';
import { ArrowLeft, Play, Square, StepForward, Settings, Save, Cpu } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const perspective = ref<'design' | 'simulate'>('design');
</script>

<template>
  <div class="h-screen flex flex-col bg-surface-1">
    <!-- Workspace Top Bar -->
    <header class="h-14 bg-white dark:bg-surface-0 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0">
      <div class="flex items-center gap-4">
        <button @click="router.push('/')" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
          <ArrowLeft :size="18" />
        </button>
        <div class="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
        <span class="font-bold text-sm tracking-tight">Untitled Architecture</span>
      </div>

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

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 mr-2" v-if="perspective === 'simulate'">
          <button class="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"><Play :size="18" fill="currentColor" /></button>
          <button class="p-2 text-slate-400"><Square :size="18" fill="currentColor" /></button>
          <button class="p-2 text-accent"><StepForward :size="18" /></button>
        </div>
        <button class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"><Save :size="18" /></button>
        <button class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"><Settings :size="18" /></button>
      </div>
    </header>

    <!-- Workspace Main Area -->
    <main class="flex-grow relative overflow-hidden">
      <!-- Design Perspective Placeholder -->
      <div v-if="perspective === 'design'" class="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <div class="text-center">
          <div class="text-slate-300 dark:text-slate-800 mb-4 flex justify-center">
             <div class="border-2 border-dashed border-current rounded-3xl p-12">
               <Cpu :size="64" />
             </div>
          </div>
          <h3 class="text-lg font-bold text-slate-400">Architecture Canvas Placeholder</h3>
          <p class="text-slate-500 text-sm">Drag modules from the palette to start designing</p>
        </div>
      </div>

      <!-- Simulate Perspective Placeholder -->
      <div v-else class="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
         <h3 class="text-lg font-bold text-slate-400">Simulation Perspective Placeholder</h3>
      </div>
    </main>
  </div>
</template>
