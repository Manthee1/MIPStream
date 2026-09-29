<script setup lang="ts">
import { ref, onMounted } from 'vue';

const stageConfig = ref({
  width: 1000,
  height: 800,
  draggable: true,
});

const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  // Basic zoom logic will go here
};

onMounted(() => {
  // Resize to container
});
</script>

<template>
  <div class="w-full h-full bg-app relative overflow-hidden">
    <!-- Grid Overlay (CSS) - Responsive to theme -->
    <div 
      class="absolute inset-0 pointer-events-none"
      style="background-image: radial-gradient(var(--border-color) 1px, transparent 0); background-size: 20px 20px; opacity: 0.2;"
    ></div>
    
    <v-stage 
      :config="stageConfig"
      @wheel="onWheel"
      class="w-full h-full"
    >
      <v-layer>
        <v-rect :config="{ x: 50, y: 50, width: 100, height: 100, fill: '#3b82f6', draggable: true }" />
      </v-layer>
    </v-stage>
  </div>
</template>

