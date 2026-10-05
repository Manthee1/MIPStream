<script setup lang="ts">
import { NButton, NSpace, NTooltip } from 'naive-ui';
import { 
  IconPointer, 
  IconArrowMoveDown, 
  IconBinaryTree, 
  IconTrash, 
  Icon
} from '@tabler/icons-vue';
import { EditorTool } from '../core/types';

defineProps<{
  activeTool: EditorTool;
}>();

const emit = defineEmits<{
  (e: 'update:activeTool', tool: EditorTool): void;
}>();

const tools : Array<{id: EditorTool, label:string, icon: Icon}> =[
  { id: 'select', label: 'Select (V)', icon: IconPointer },
  { id: 'wire', label: 'Wire (W)', icon: IconBinaryTree },
  { id: 'place', label: 'Place (P)', icon: IconArrowMoveDown },
  { id: 'delete', label: 'Delete (D)', icon: IconTrash },
];
</script>

<template>
  <div class="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-surface border border-border-color p-1 shadow-lg">
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
  </div>
</template>
