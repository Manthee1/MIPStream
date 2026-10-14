<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { SchematicDesigner } from '../core/designer';
import { setActiveDesigner } from '../core/designer-bridge';
import { setSelection, bumpDocumentRevision } from '../core/selection-bridge';
import { setProblems, clearProblems } from '../core/problems-bridge';
import { EditorTool, EditorMode, ViewportState, PlacementState } from '../core/types';
import type { GridSettings } from '@/shared/types/architecture';
import { useProjectStore } from '@/stores/projectStore';
import { syncLiveArchitecture } from '@/composables/useProjectSave';
import EditorToolbar from './EditorToolbar.vue';
import EditorStatusBar from './EditorStatusBar.vue';

/** Grid defaults for projects without persisted grid settings. */
const DEFAULT_GRID_SETTINGS: GridSettings = { show: true, style: 'lines', size: 20 };

/**
 * Runtime mode: 'editor' offers the full design toolset; 'viewer' mounts the
 * same canvas locked for simulation (no palette, no routing, no dragging).
 */
const props = withDefaults(defineProps<{ mode?: EditorMode }>(), { mode: 'editor' });

const canvasContainer = ref<HTMLDivElement | null>(null);
let designer: SchematicDesigner | null = null;

const projectStore = useProjectStore();

const activeTool = ref<EditorTool>('select');
const viewport = ref<ViewportState>({ x: 0, y: 0, zoom: 1 });
const placement = ref<PlacementState | null>(null);
const isRouting = ref(false);
const gridSettings = ref<GridSettings>({ ...DEFAULT_GRID_SETTINGS });

/** True once the user mutates the document (drives unmount-time syncing). */
let documentDirty = false;

onMounted(() => {
  if (!canvasContainer.value) return;

  // Grid settings persist per-architecture; fall back to editor defaults.
  const stored = projectStore.currentProject?.architecture?.configuration?.grid;
  gridSettings.value = stored
    ? { ...DEFAULT_GRID_SETTINGS, ...stored }
    : { ...DEFAULT_GRID_SETTINGS };

  const instance = new SchematicDesigner({
    container: canvasContainer.value,
    mode: props.mode,
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
    },
    onSelectionChange: (ids) => {
      setSelection(ids);
    },
    onDocumentChange: () => {
      documentDirty = true;
      projectStore.markUnsaved();
      bumpDocumentRevision();
    },
    onProblemsChange: (issues) => {
      setProblems(issues);
    }
  });
  designer = instance;

  // Restore the project's saved architecture onto the canvas.
  const architecture = projectStore.currentProject?.architecture;
  if (architecture && (architecture.modules?.length || architecture.nets?.length)) {
    const warnings = instance.loadArchitecture(architecture);
    if (warnings.length > 0) console.warn('Architecture restored with warnings:', warnings);
  }

  // Expose the designer to app-level flows (e.g. Ctrl+S save).
  setActiveDesigner(instance);
});

onBeforeUnmount(() => {
  // Carry unsaved canvas edits into the project store so a perspective
  // switch (and the simulation engine) sees the live document, not the last
  // save. The project is marked unsaved; persistence stays on explicit save.
  if (documentDirty) syncLiveArchitecture();

  setActiveDesigner(null);
  setSelection([]);
  clearProblems();
  designer?.destroy();
  designer = null;
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
      v-if="mode === 'editor'"
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


