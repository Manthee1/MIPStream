<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { SchematicDesigner } from '../core/designer';
import { EditorTool, ViewportState } from '../core/types';
import EditorToolbar from './EditorToolbar.vue';
import EditorStatusBar from './EditorStatusBar.vue';

const canvasContainer = ref<HTMLDivElement | null>(null);
let designer: SchematicDesigner | null = null;

const activeTool = ref<EditorTool>('select');
const viewport = ref<ViewportState>({ x: 0, y: 0, zoom: 1 });

onMounted(() => {
  if (canvasContainer.value) {
    designer = new SchematicDesigner({
      container: canvasContainer.value,
      mode: 'editor',
      gridSize: 20,
      onViewportChange: (state) => {
        viewport.value = state;
      },
      onToolChange: (tool) => {
        activeTool.value = tool;
      }
    });
  }
});

onBeforeUnmount(() => {
  designer?.destroy();
});

const handleToolChange = (tool: EditorTool) => {
  activeTool.value = tool;
  designer?.setTool(tool);
};
</script>

<template>
  <div class="w-full h-full relative flex flex-col bg-app overflow-hidden">
    <!-- Overlay UI -->
    <EditorToolbar 
      :active-tool="activeTool" 
      @update:active-tool="handleToolChange" 
    />
    
    <div 
      ref="canvasContainer" 
      class="flex-1 w-full h-full cursor-default"
    ></div>

    <EditorStatusBar :viewport="viewport" />
  </div>
</template>

<style scoped>
/* Ensure Konva container takes full space */
:deep(.konvajs-content) {
  background-color: transparent !important;
}
</style>

