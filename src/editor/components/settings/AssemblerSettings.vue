<script setup lang="ts">
/** @format */

import { computed } from 'vue';
import { NButton, NIcon, NSelect, NText } from 'naive-ui';
import { IconBolt } from '@tabler/icons-vue';
import type { ArchitectureConfiguration } from '@/shared/types/architecture';

export interface MemoryModuleOption {
  id: string;
  label: string;
}

const props = defineProps<{
  configuration: ArchitectureConfiguration;
  editorOptions: { label: string; value: string }[];
  memoryOptions: MemoryModuleOption[];
}>();

const assembler = () => props.configuration.assembler;

const memorySelectOptions = computed(() =>
  props.memoryOptions.map((option) => ({ label: option.label, value: option.id })),
);

function getMemoryIds(editorId: string): string[] {
  return assembler().mappings.find((mapping) => mapping.editorId === editorId)?.memoryModuleIds ?? [];
}

function setEditorTargets(editorId: string, memoryIds: string[]): void {
  const existing = assembler().mappings.find((mapping) => mapping.editorId === editorId);
  if (memoryIds.length === 0) {
    if (existing) assembler().mappings.splice(assembler().mappings.indexOf(existing), 1);
    return;
  }
  if (existing) {
    existing.memoryModuleIds = memoryIds;
    return;
  }
  assembler().mappings.push({ editorId, memoryModuleIds: memoryIds });
}

/**
 * Auto-map: each unmapped editor gets the first memory that is not targeted
 * *at all* yet, falling back to the last memory (so one-to-many is still
 * representable by editing afterwards).
 */
function autoMap(): void {
  const used = new Set(assembler().mappings.flatMap((mapping) => mapping.memoryModuleIds));
  const available = props.memoryOptions.filter((option) => !used.has(option.id));
  const next: ArchitectureConfiguration['assembler']['mappings'] = [];

  for (const editor of props.editorOptions) {
    const current = getMemoryIds(editor.value);
    if (current.length > 0) {
      next.push({ editorId: editor.value, memoryModuleIds: current });
      continue;
    }
    const target = available.shift()?.id ?? props.memoryOptions[props.memoryOptions.length - 1]?.id;
    if (target) next.push({ editorId: editor.value, memoryModuleIds: [target] });
  }

  assembler().mappings = next;
}

const warnings = computed(() => {
  const warnings: string[] = [];

  for (const editor of props.editorOptions) {
    if (getMemoryIds(editor.value).length === 0) {
      warnings.push(`Editor "${editor.label}" does not assemble into any instruction memory.`);
    }
  }

  const duplicates = new Map<string, string[]>();
  for (const mapping of assembler().mappings) {
    for (const memoryId of mapping.memoryModuleIds) {
      const list = duplicates.get(memoryId) ?? [];
      list.push(mapping.editorId);
      duplicates.set(memoryId, list);
    }
  }

  for (const [memoryId, editors] of duplicates.entries()) {
    if (editors.length > 1) {
      warnings.push(
        `Instruction memory "${memoryId}" is targeted by multiple editors (${editors.join(', ')}); their programs will overwrite each other.`,
      );
    }
  }

  const knownEditors = new Set(props.editorOptions.map((editor) => editor.value));
  for (const mapping of assembler().mappings) {
    if (!knownEditors.has(mapping.editorId)) {
      warnings.push(`Mapping references unknown editor "${mapping.editorId}".`);
    }
    const knownMemories = new Set(props.memoryOptions.map((option) => option.id));
    for (const memoryId of mapping.memoryModuleIds) {
      if (!knownMemories.has(memoryId)) {
        warnings.push(`Mapping references removed instruction memory "${memoryId}".`);
      }
    }
  }

  return warnings;
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <n-text strong class="text-sm">Assembler mapping matrix</n-text>
        <n-text depth="3" class="block text-xs">
          Each editor row selects every instruction memory its program assembles into (one-to-many).
        </n-text>
      </div>
      <n-button size="tiny" dashed :disabled="editorOptions.length === 0 || memoryOptions.length === 0"
        @click="autoMap">
        <template #icon><n-icon :size="14">
            <IconBolt />
          </n-icon></template>
        Auto-map
      </n-button>
    </div>

    <div v-if="editorOptions.length === 0" class="text-xs text-gray-500">
      No editor sources are available yet.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th class="border px-2 py-1 text-left">Editor</th>
            <th class="border px-2 py-1 text-left">Instruction memories</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="editor in editorOptions" :key="editor.value">
            <td class="border px-2 py-1 whitespace-nowrap">{{ editor.label }}</td>
            <td class="border px-2 py-1">
              <n-select size="small" multiple clearable placeholder="Not assembled" :value="getMemoryIds(editor.value)"
                :options="memorySelectOptions" :max-tag-count="3"
                @update:value="(value: string[]) => setEditorTargets(editor.value, value)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="warnings.length > 0" class="flex flex-col gap-0.5">
      <n-text v-for="warning in warnings" :key="warning" type="warning" class="text-xs">
        {{ warning }}
      </n-text>
    </div>

    <n-text v-if="memoryOptions.length === 0" depth="3" class="text-xs">
      Add an instruction-memory module to the schematic before mapping assembly output.
    </n-text>
  </div>
</template>
