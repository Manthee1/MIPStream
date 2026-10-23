<script setup lang="ts">
/** @format */

import { computed } from 'vue';
import { NButton, NInput, NInputNumber, NText } from 'naive-ui';
import { IconCpu } from '@tabler/icons-vue';
import type { ArchitectureConfiguration } from '@/shared/types/architecture';
import { cloneAssemblerConfig, MIPS_ASSEMBLER_CONFIG } from '@/config/isa-presets';
import { isaWarnings } from '@/shared/utils/isa-validation';
import ISAFieldsEditor from './isa/ISAFieldsEditor.vue';
import ISAInstructionTypesEditor from './isa/ISAInstructionTypesEditor.vue';
import ISAInstructionsEditor from './isa/ISAInstructionsEditor.vue';

const props = defineProps<{ configuration: ArchitectureConfiguration }>();

const isa = () => props.configuration.isa;

function setTotalBits(value: number | null): void {
  if (value === null) return;
  isa().total_bits = Math.min(64, Math.max(1, value));
}

function loadMipsPreset(): void {
  props.configuration.isa = cloneAssemblerConfig(MIPS_ASSEMBLER_CONFIG);
}

const warnings = computed(() => isaWarnings(isa()));
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-end justify-between gap-4">
      <div class="flex items-end gap-4">
        <div class="flex flex-col gap-1">
          <n-text strong class="text-xs uppercase tracking-widest opacity-50">Format name</n-text>
          <n-input size="small" class="w-48" placeholder="MIPS32" :value="isa().format_name ?? ''"
            @update:value="(value: string) => (isa().format_name = value)" />
        </div>
        <div class="flex flex-col gap-1">
          <n-text strong class="text-xs uppercase tracking-widest opacity-50">Word width (bits)</n-text>
          <n-input-number size="small" class="w-24" :min="1" :max="64" :show-button="false"
            :value="isa().total_bits ?? 32" @update:value="setTotalBits" />
        </div>
      </div>
      <n-button size="tiny" dashed @click="loadMipsPreset">
        <template #icon><n-icon :size="14">
            <IconCpu />
          </n-icon></template>
        Load MIPS32 preset
      </n-button>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
      <ISAFieldsEditor :isa="isa()" />
      <ISAInstructionTypesEditor :isa="isa()" />
    </div>

    <ISAInstructionsEditor :isa="isa()" />

    <div v-if="warnings.length > 0" class="flex flex-col gap-0.5">
      <n-text v-for="warning in warnings" :key="warning" type="warning" class="text-xs">
        {{ warning }}
      </n-text>
    </div>
  </div>
</template>
