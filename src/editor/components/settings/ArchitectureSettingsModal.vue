<script setup lang="ts">
/** @format */

import { computed, ref } from 'vue';
import { NButton, NCard, NModal, NScrollbar, NTabs, NTabPane, NText, NIcon } from 'naive-ui';
import { IconAdjustments, IconBinary, IconCpu } from '@tabler/icons-vue';
import { useProjectStore } from '@/stores/projectStore';
import { useArchitectureSettings } from '@/composables/useArchitectureSettings';
import PipelineSettings from './PipelineSettings.vue';
import AssemblerSettings from './AssemblerSettings.vue';
import ISASettings from './ISASettings.vue';

const projectStore = useProjectStore();
const { show, draft, warnings, commit } = useArchitectureSettings();

const activeTab = ref('pipeline');

const editorOptions = computed(() =>
  (projectStore.currentProject?.software?.editors ?? []).map((editor) => ({
    label: editor.name || editor.id,
    value: editor.id,
  }))
);

/** Instruction-memory modules on the current architecture (std.imem). */
const memoryOptions = computed(() =>
  (projectStore.currentProject?.architecture?.modules ?? [])
    .filter((module) => module.typeId === 'std.imem')
    .map((module) => ({ id: module.designator, label: module.designator }))
);
</script>

<template>
  <n-modal
    v-model:show="show"
    :auto-focus="false"
    :mask-closable="false"
    close-on-esc
  >
    <n-card
      class="w-[min(1100px,92vw)]"
      title="Architecture Settings"
      :bordered="false"
      size="small"
      role="dialog"
      closable
      @close="show = false"
    >
      <template #header-extra>
        <n-text depth="3" class="text-xs">{{ projectStore.currentProject?.architecture?.name }}</n-text>
      </template>

      <n-scrollbar v-if="draft" class="max-h-[78vh] pr-2">
        <n-tabs v-model:value="activeTab" type="line" animated class="pt-1">
          <n-tab-pane name="pipeline" tab="Pipeline">
            <template #tab>
              <div class="flex items-center gap-1.5">
                <n-icon :size="14"><IconAdjustments /></n-icon> Pipeline
              </div>
            </template>
            <div class="pt-3">
              <PipelineSettings :configuration="draft" />
            </div>
          </n-tab-pane>
          <n-tab-pane name="assembler" tab="Assembler">
            <template #tab>
              <div class="flex items-center gap-1.5">
                <n-icon :size="14"><IconBinary /></n-icon> Assembler
              </div>
            </template>
            <div class="pt-3">
              <AssemblerSettings
                :configuration="draft"
                :editor-options="editorOptions"
                :memory-options="memoryOptions"
              />
            </div>
          </n-tab-pane>
          <n-tab-pane name="isa" tab="ISA Definition">
            <template #tab>
              <div class="flex items-center gap-1.5">
                <n-icon :size="14"><IconCpu /></n-icon> ISA Definition
              </div>
            </template>
            <div class="pt-3">
              <ISASettings :configuration="draft" />
            </div>
          </n-tab-pane>
        </n-tabs>
      </n-scrollbar>

      <div v-if="warnings.length > 0" class="flex flex-col gap-0.5 mt-2">
        <n-text v-for="warning in warnings" :key="warning" type="warning" class="text-xs">
          {{ warning }}
        </n-text>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button size="small" @click="show = false">Cancel</n-button>
          <n-button size="small" type="primary" :disabled="!draft" @click="commit">OK</n-button>
        </div>
      </template>
    </n-card>
  </n-modal>
</template>
