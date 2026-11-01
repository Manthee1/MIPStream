<script setup lang="ts">
/** @format */

import { computed } from 'vue';
import { NButton, NIcon, NInput, NPopconfirm, NTag, NText } from 'naive-ui';
import { IconPlus, IconTrash } from '@tabler/icons-vue';
import type { ArchitectureConfiguration } from '@/shared/types/architecture';
import type { ProjectEditor } from '@/shared/types/project';
import { createEditor } from '@/shared/utils/project-editors';

/**
 * Architecture-settings "Editors" tab — add, rename and remove the project's
 * code editors (the software layer) alongside their assembler mappings.
 *
 * Blank architectures previously had no way to gain an editor, which blocked
 * the assemble → load → run loop for every non-template architecture; this
 * closes that gap. Both props are DRAFT objects owned by
 * `useArchitectureSettings` — mutations land in the project only on commit.
 */
const props = defineProps<{
  editors: ProjectEditor[];
  configuration: ArchitectureConfiguration;
}>();

function addEditor(): void {
  // In-place push keeps the draft array identity (the composable owns it).
  props.editors.push(createEditor(props.editors));
}

function removeEditor(index: number): void {
  const [removed] = props.editors.splice(index, 1);
  if (!removed) return;
  // The drafted mapping matrix must never reference a removed editor.
  props.configuration.assembler.mappings = props.configuration.assembler.mappings.filter(
    (mapping) => mapping.editorId !== removed.id,
  );
}

/** Editor ids that assemble into at least one instruction memory. */
const mappedEditorIds = computed(
  () =>
    new Set(
      props.configuration.assembler.mappings
        .filter((mapping) => mapping.memoryModuleIds.length > 0)
        .map((mapping) => mapping.editorId),
    ),
);

function isMapped(editor: ProjectEditor): boolean {
  return mappedEditorIds.value.has(editor.id);
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <n-text strong class="text-sm">Code editors</n-text>
        <n-text depth="3" class="block text-xs">
          Each editor becomes a Simulate-mode tab; map it to an instruction memory in the Assembler tab.
        </n-text>
      </div>
      <n-button size="tiny" dashed @click="addEditor">
        <template #icon>
          <n-icon :size="14">
            <IconPlus />
          </n-icon>
        </template>
        Add editor
      </n-button>
    </div>

    <n-text v-if="editors.length === 0" depth="3" class="text-xs">
      No editors. Add one to write and assemble programs against this architecture.
    </n-text>

    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th class="border px-2 py-1 text-left">Name</th>
            <th class="border px-2 py-1 text-left">Id</th>
            <th class="border px-2 py-1 text-left">Assembles into</th>
            <th class="border px-2 py-1 w-10" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(editor, index) in editors" :key="editor.id">
            <td class="border px-2 py-1">
              <n-input size="small" class="font-mono" placeholder="main.s" :value="editor.name"
                @update:value="(value: string) => (editor.name = value)" />
            </td>
            <td class="border px-2 py-1 font-mono text-secondary whitespace-nowrap">{{ editor.id }}</td>
            <td class="border px-2 py-1">
              <n-tag v-if="isMapped(editor)" size="small" type="success" :bordered="false">Mapped</n-tag>
              <n-tag v-else size="small" type="warning" :bordered="false">No instruction memory</n-tag>
            </td>
            <td class="border text-center">
              <n-popconfirm @positive-click="removeEditor(index)">
                <template #trigger>
                  <n-button size="tiny" quaternary type="error">
                    <n-icon :size="14">
                      <IconTrash />
                    </n-icon>
                  </n-button>
                </template>
                Remove "{{ editor.name || editor.id }}" and its source? This cannot be undone by the editor history.
              </n-popconfirm>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
