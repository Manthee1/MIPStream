<script setup lang="ts">
import {
  NButton,
  NSpace,
  NTooltip,
  NPopover,
  NSwitch,
  NRadioGroup,
  NRadio
} from 'naive-ui';
import { 
  IconPointer, 
  IconArrowMoveDown, 
  IconBinaryTree, 
  IconTrash,
  IconGridDots,
  IconArrowBackUp,
  IconArrowForwardUp,
  Icon
} from '@tabler/icons-vue';
import { EditorTool } from '../core/types';
import type { GridSettings } from '@/shared/types/architecture';
import { canUndo, canRedo } from '../core/history-bridge';
import { getActiveDesigner } from '../core/designer-bridge';

const props = defineProps<{
  activeTool: EditorTool;
  gridSettings: GridSettings;
}>();

const emit = defineEmits<{
  (e: 'update:activeTool', tool: EditorTool): void;
  (e: 'update:gridSettings', settings: GridSettings): void;
}>();

const tools : Array<{id: EditorTool, label:string, icon: Icon}> =[
  { id: 'select', label: 'Select (V)', icon: IconPointer },
  { id: 'wire', label: 'Wire (W)', icon: IconBinaryTree },
  { id: 'place', label: 'Place (P)', icon: IconArrowMoveDown },
  { id: 'delete', label: 'Delete (D)', icon: IconTrash },
];

/** Merges a partial grid setting patch and forwards the new settings. */
const updateGrid = (patch: Partial<GridSettings>): void => {
  emit('update:gridSettings', { ...props.gridSettings, ...patch });
};

/** Undoes/redoes the last committed document change on the active designer. */
const undo = (): void => getActiveDesigner()?.undo();
const redo = (): void => getActiveDesigner()?.redo();
</script>

<template>
  <div class="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-surface border border-border-color p-1 shadow-lg flex items-center">
    <n-space :size="4">
      <n-tooltip v-for="tool in tools" :key="tool.id" placement="bottom">
        <template #trigger>
          <n-button
            secondary
            :type="activeTool === tool.id ? 'primary' : 'default'"
            size="small"
            @click="emit('update:activeTool', tool.id)"
            class="!rounded-none h-10 w-10 p-0"
          >
            <component :is="tool.icon" size="20" />
          </n-button>
        </template>
        {{ tool.label }}
      </n-tooltip>
    </n-space>

    <div class="w-px h-6 bg-border-color mx-2"></div>

    <n-space :size="4">
      <n-tooltip placement="bottom">
        <template #trigger>
          <n-button
            secondary
            size="small"
            :disabled="!canUndo"
            @click="undo"
            class="!rounded-none h-10 w-10 p-0"
          >
            <component :is="IconArrowBackUp" size="20" />
          </n-button>
        </template>
        Undo (Ctrl+Z)
      </n-tooltip>
      <n-tooltip placement="bottom">
        <template #trigger>
          <n-button
            secondary
            size="small"
            :disabled="!canRedo"
            @click="redo"
            class="!rounded-none h-10 w-10 p-0"
          >
            <component :is="IconArrowForwardUp" size="20" />
          </n-button>
        </template>
        Redo (Ctrl+Y)
      </n-tooltip>
    </n-space>

    <div class="w-px h-6 bg-border-color mx-2"></div>

    <n-popover placement="bottom" trigger="click">
      <template #trigger>
        <n-button secondary size="small" class="!rounded-none h-10 w-10 p-0">
          <component :is="IconGridDots" size="20" />
        </n-button>
      </template>
      <div class="w-48 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xs">Show grid</span>
          <n-switch
            size="small"
            :value="gridSettings.show"
            @update:value="updateGrid({ show: $event })"
          />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs">Style</span>
          <n-radio-group
            size="small"
            :value="gridSettings.style"
            :disabled="!gridSettings.show"
            @update:value="updateGrid({ style: $event as GridSettings['style'] })"
          >
            <n-radio value="lines">Lines</n-radio>
            <n-radio value="dots">Dots</n-radio>
          </n-radio-group>
        </div>
      </div>
    </n-popover>
  </div>
</template>
