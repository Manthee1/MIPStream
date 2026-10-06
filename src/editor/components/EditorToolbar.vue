<script setup lang="ts">
import { 
  NButton, 
  NSpace, 
  NTooltip,
  NPopover,
  NSwitch,
  NRadioGroup,
  NRadio,
  NInputNumber
} from 'naive-ui';
import { 
  IconPointer, 
  IconArrowMoveDown, 
  IconBinaryTree, 
  IconTrash,
  IconGridDots,
  Icon
} from '@tabler/icons-vue';
import { EditorTool } from '../core/types';
import type { GridSettings } from '@/shared/types/architecture';

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
        <div class="flex items-center justify-between">
          <span class="text-xs">Size</span>
          <n-input-number
            size="small"
            class="!w-24"
            :min="1"
            :step="1"
            :value="gridSettings.size"
            :disabled="!gridSettings.show"
            @update:value="updateGrid({ size: $event ?? gridSettings.size })"
          />
        </div>
      </div>
    </n-popover>
  </div>
</template>
