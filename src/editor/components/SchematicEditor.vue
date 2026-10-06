<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { SchematicDesigner } from '../core/designer';
import { EditorTool, ViewportState, PlacementState } from '../core/types';
import type { GridSettings } from '@/shared/types/architecture';
import { useProjectStore } from '@/stores/projectStore';
import EditorToolbar from './EditorToolbar.vue';
import EditorStatusBar from './EditorStatusBar.vue';

/** Grid defaults for projects without persisted grid settings. */
const DEFAULT_GRID_SETTINGS: GridSettings = { show: true, style: 'lines', size: 20 };

const canvasContainer = ref<HTMLDivElement | null>(null);
let designer: SchematicDesigner | null = null;

const projectStore = useProjectStore();

const activeTool = ref<EditorTool>('select');
const viewport = ref<ViewportState>({ x: 0, y: 0, zoom: 1 });
const placement = ref<PlacementState | null>(null);
const isRouting = ref(false);
const gridSettings = ref<GridSettings>({ ...DEFAULT_GRID_SETTINGS });

onMounted(() => {
  if (!canvasContainer.value) return;

  // Grid settings persist per-architecture; fall back to editor defaults.
  const stored = projectStore.currentProject?.architecture?.configuration?.grid;
  gridSettings.value = stored
    ? { ...DEFAULT_GRID_SETTINGS, ...stored }
    : { ...DEFAULT_GRID_SETTINGS };

  designer = new SchematicDesigner({
    container: canvasContainer.value,
    mode: 'editor',
    gridSettings: gridSettings.value,
    onViewportChange: (state) => {
      viewport.value = state;
    },
    onToolChange: (tool) => {
      activeTool.value = tool;
    },
    onPlacementChange: (state) => {
      placement.value = state;
    },
    onRoutingChange: (active) => {
      isRouting.value = active;
    }
  });
});

onBeforeUnmount(() => {
  designer?.destroy();
});

const handleToolChange = (tool: EditorTool) => {
  activeTool.value = tool;
  designer?.setTool(tool);
};

const handleGridSettingsChange = (settings: GridSettings) => {
  gridSettings.value = settings;
  designer?.applyGridSettings(settings);

  // Persist the settings with the architecture (marks the project unsaved).
  projectStore.updateArchitecture((architecture) => {
    architecture.configuration.grid = settings;
  });
};
</script>

<template>
  <div class="w-full h-full relative flex flex-col bg-app overflow-hidden">
    <!-- Overlay UI -->
    <EditorToolbar 
      :active-tool="activeTool" 
      :grid-settings="gridSettings"
      @update:active-tool="handleToolChange" 
      @update:grid-settings="handleGridSettingsChange"
    />
    
    <div 
      ref="canvasContainer" 
      class="flex-1 w-full h-full cursor-default"
    ></div>

    <EditorStatusBar :viewport="viewport" :placement="placement" :routing="isRouting" />
  </div>
</template>

<style scoped>
/* Ensure Konva container takes full space */
:deep(.konvajs-content) {
  background-color: transparent !important;
}
</style>

