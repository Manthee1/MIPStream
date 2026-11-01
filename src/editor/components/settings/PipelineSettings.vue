<script setup lang="ts">
/** @format */

import { NButton, NIcon, NInput, NSelect, NSwitch, NText } from 'naive-ui';
import {
  IconArrowUp,
  IconArrowDown,
  IconPlus,
  IconTrash,
  IconRestore,
} from '@tabler/icons-vue';
import type { ArchitectureConfiguration } from '@/shared/types/architecture';
import {
  makeStageId,
  moveStage,
  pipelineWarnings,
} from '@/shared/utils/pipeline-stages';
import { createDefaultPipelineStages } from '@/config/default-configuration';

const props = defineProps<{ configuration: ArchitectureConfiguration }>();

const pipeline = () => props.configuration.pipeline;

function setEnabled(value: boolean): void {
  pipeline().enabled = value;
}

function setShowInstructionBar(value: boolean): void {
  pipeline().showInstructionBar = value;
}

function addStage(): void {
  const config = pipeline();
  const id = makeStageId(`STAGE${config.stages.length + 1}`, config.stages);
  config.stages.push({ id, name: `Stage ${config.stages.length + 1}` });
}

function restoreDefaultStages(): void {
  pipeline().stages = createDefaultPipelineStages();
}

/**
 * Edits the shorthand id: normalized (upper-snake) and de-duplicated, with a
 * rename cascade to `startStageBoundary`. Boundary registers are matched by
 * stage index, so the canvas labels refresh on commit without orphaning.
 */
function renameStageId(index: number, nextId: string): void {
  const stage = pipeline().stages[index];
  if (!stage) return;

  const normalized = nextId.trim().replace(/\s+/g, '_').toUpperCase();
  const existing = pipeline().stages.some((item, i) => i !== index && item.id === normalized);
  const resolved = existing
    ? makeStageId(normalized, pipeline().stages.filter((_, i) => i !== index))
    : normalized;

  if (resolved === stage.id) return;

  const previous = stage.id;
  stage.id = resolved;
  if (pipeline().startStageBoundary === previous) {
    pipeline().startStageBoundary = resolved;
  }
}

function removeStage(index: number): void {
  const config = pipeline();
  const [removed] = config.stages.splice(index, 1);
  if (!removed) return;
  if (config.startStageBoundary === removed.id) {
    config.startStageBoundary = undefined;
  }
}

const stageOptions = () =>
  pipeline().stages.map((stage) => ({ label: stage.name || stage.id, value: stage.id }));

const warnings = () => pipelineWarnings(pipeline().stages, pipeline().startStageBoundary);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <n-text strong class="text-sm">Pipeline enabled</n-text>
        <n-text depth="3" class="block text-xs">Enables the stage instruction visualizer.</n-text>
      </div>
      <n-switch :value="configuration.pipeline.enabled" @update:value="setEnabled" />
    </div>

    <div class="flex items-center justify-between">
      <div>
        <n-text strong class="text-sm">Instruction display bar</n-text>
        <n-text depth="3" class="block text-xs">Shows each instruction moving through the stages above the
          diagram.</n-text>
      </div>
      <n-switch :value="configuration.pipeline.showInstructionBar !== false"
        :disabled="!configuration.pipeline.enabled" @update:value="setShowInstructionBar" />
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <n-text strong class="text-xs uppercase tracking-widest opacity-50">Stages</n-text>
        <div class="flex gap-2">
          <n-button size="tiny" dashed @click="restoreDefaultStages">
            <template #icon><n-icon :size="14">
                <IconRestore />
              </n-icon></template>
            Restore IF/ID/EX/MEM/WB
          </n-button>
          <n-button size="tiny" dashed @click="addStage">
            <template #icon><n-icon :size="14">
                <IconPlus />
              </n-icon></template>
            Add stage
          </n-button>
        </div>
      </div>

      <n-text v-if="configuration.pipeline.stages.length === 0" depth="3" class="text-xs">
        No stages configured. Boundary registers appear on the canvas after committing stages.
      </n-text>

      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th class="border px-2 py-1 text-left w-16">Order</th>
              <th class="border px-2 py-1 text-left w-32">Shorthand</th>
              <th class="border px-2 py-1 text-left">Label</th>
              <th class="border px-2 py-1 w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(stage, index) in configuration.pipeline.stages" :key="index">
              <td class="border px-2 py-1">
                <div class="flex items-center gap-1">
                  <n-button size="tiny" quaternary :disabled="index === 0"
                    @click="configuration.pipeline.stages = moveStage(configuration.pipeline.stages, index, -1)">
                    <n-icon :size="14">
                      <IconArrowUp />
                    </n-icon>
                  </n-button>
                  <n-button size="tiny" quaternary :disabled="index === configuration.pipeline.stages.length - 1"
                    @click="configuration.pipeline.stages = moveStage(configuration.pipeline.stages, index, 1)">
                    <n-icon :size="14">
                      <IconArrowDown />
                    </n-icon>
                  </n-button>
                </div>
              </td>
              <td class="border px-2 py-1">
                <n-input size="small" class="font-mono" placeholder="IF" :value="stage.id"
                  @update:value="(value: string) => renameStageId(index, value)" />
              </td>
              <td class="border px-2 py-1">
                <n-input size="small" placeholder="Instruction Fetch" :value="stage.name"
                  @update:value="(value: string) => (stage.name = value)" />
              </td>
              <td class="border text-center">
                <n-button size="tiny" quaternary type="error" @click="removeStage(index)">
                  <n-icon :size="14">
                    <IconTrash />
                  </n-icon>
                </n-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div>
        <n-text strong class="text-sm">Start stage boundary</n-text>
        <n-text depth="3" class="block text-xs">First boundary register in the visualizer, e.g. the IF/ID
          register.</n-text>
      </div>
      <n-select size="small" class="w-48" clearable placeholder="None"
        :value="configuration.pipeline.startStageBoundary ?? null" :options="stageOptions()"
        :disabled="!configuration.pipeline.enabled || configuration.pipeline.stages.length === 0"
        @update:value="(value: string | null) => (configuration.pipeline.startStageBoundary = value ?? undefined)" />
    </div>

    <div v-if="warnings().length > 0" class="flex flex-col gap-0.5">
      <n-text v-for="warning in warnings()" :key="warning" type="warning" class="text-xs">
        {{ warning }}
      </n-text>
    </div>
  </div>
</template>
