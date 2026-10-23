<script setup lang="ts">
/** @format */

import { NButton, NIcon, NInput, NInputNumber, NSelect, NText } from 'naive-ui';
import { IconPlus, IconTrash } from '@tabler/icons-vue';
import type { AssemblerConfig, AssemblerFieldConfig, field_types } from '@/shared/types/isa';

const props = defineProps<{ isa: AssemblerConfig }>();

const FIELD_TYPE_OPTIONS: { label: string; value: field_types }[] = [
  { label: 'Register', value: 'register' },
  { label: 'Raw value', value: 'raw_value' },
  { label: 'Label absolute', value: 'label_absolute' },
  { label: 'Label relative', value: 'label_relative' },
  { label: 'Memory address', value: 'memory_address' },
];

function addField(): void {
  const name = `field${props.isa.fields.length + 1}`;
  const previous = props.isa.fields[props.isa.fields.length - 1];
  const lastEnd = previous?.ranges[previous.ranges.length - 1]?.[1] ?? -1;
  props.isa.fields.push({
    field: name,
    label: name,
    def_type: 'raw_value',
    bits: 1,
    ranges: [[lastEnd + 1, lastEnd + 1]],
  });
}

function removeField(index: number): void {
  props.isa.fields.splice(index, 1);
}

function addRange(field: AssemblerFieldConfig): void {
  const lastEnd = field.ranges[field.ranges.length - 1]?.[1] ?? -1;
  field.ranges.push([lastEnd + 1, lastEnd + Math.max(1, field.bits)]);
}

function setRangeStart(field: AssemblerFieldConfig, rangeIndex: number, start: number | null): void {
  if (start === null) return;
  const range = field.ranges[rangeIndex];
  if (!range) return;
  range[0] = Math.max(0, start);
  if (range[1] < range[0]) range[1] = range[0];
  syncBits(field);
}

function setRangeEnd(field: AssemblerFieldConfig, rangeIndex: number, end: number | null): void {
  if (end === null) return;
  const range = field.ranges[rangeIndex];
  if (!range) return;
  range[1] = Math.max(range[0], end);
  syncBits(field);
}

/** `bits` mirrors the total width of the segments for single-range fields. */
function syncBits(field: AssemblerFieldConfig): void {
  if (field.ranges.length !== 1) return;
  field.bits = field.ranges[0][1] - field.ranges[0][0] + 1;
}
</script>

<template>
  <div class="flex flex-col gap-2 h-full">
    <div class="flex items-center justify-between">
      <div>
        <n-text strong class="text-sm">Instruction fields</n-text>
        <n-text depth="3" class="block text-xs">Bit segments inside the instruction word; overlapping segments are legal.</n-text>
      </div>
      <n-button size="tiny" dashed @click="addField">
        <template #icon><n-icon :size="14"><IconPlus /></n-icon></template>
        Add field
      </n-button>
    </div>

    <n-text v-if="isa.fields.length === 0" depth="3" class="text-xs">No fields yet.</n-text>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th class="border px-1.5 py-1 text-left">Field</th>
            <th class="border px-1.5 py-1 text-left">Label</th>
            <th class="border px-1.5 py-1 text-left w-24">Bits</th>
            <th class="border px-1.5 py-1 text-left">Ranges</th>
            <th class="border px-1.5 py-1 text-left w-32">Kind</th>
            <th class="border px-1.5 py-1 w-8" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(field, index) in isa.fields" :key="index">
            <td class="border p-1">
              <n-input size="small" class="font-mono" :value="field.field" @update:value="(value: string) => (field.field = value.trim())" />
            </td>
            <td class="border p-1">
              <n-input size="small" :value="field.label" @update:value="(value: string) => (field.label = value.trim())" />
            </td>
            <td class="border p-1">
              <n-input-number
                size="small"
                class="w-full"
                :min="1"
                :max="64"
                :show-button="false"
                :value="field.bits"
                @update:value="(value: number | null) => value !== null && (field.bits = value)"
              />
            </td>
            <td class="border p-1">
              <div class="flex flex-col gap-1">
                <div
                  v-for="(range, rangeIndex) in field.ranges"
                  :key="rangeIndex"
                  class="flex items-center gap-1"
                >
                  <n-input-number
                    size="small"
                    class="w-16"
                    :min="0"
                    :show-button="false"
                    :value="range[0]"
                    @update:value="(value: number | null) => setRangeStart(field, rangeIndex, value)"
                  />
                  <span class="text-[10px] opacity-60">to</span>
                  <n-input-number
                    size="small"
                    class="w-16"
                    :min="0"
                    :show-button="false"
                    :value="range[1]"
                    @update:value="(value: number | null) => setRangeEnd(field, rangeIndex, value)"
                  />
                  <n-button size="tiny" quaternary type="error" :disabled="field.ranges.length === 1" @click="field.ranges.splice(rangeIndex, 1)">
                    <n-icon :size="12"><IconTrash /></n-icon>
                  </n-button>
                </div>
                <n-button size="tiny" quaternary @click="addRange(field)">
                  <template #icon><n-icon :size="12"><IconPlus /></n-icon></template>
                  Add segment
                </n-button>
              </div>
            </td>
            <td class="border p-1">
              <n-select
                size="small"
                :value="field.def_type"
                :options="FIELD_TYPE_OPTIONS"
                @update:value="(value: string | number | null) => value !== null && (field.def_type = String(value) as field_types)"
              />
            </td>
            <td class="border text-center">
              <n-button size="tiny" quaternary type="error" @click="removeField(index)">
                <n-icon :size="14"><IconTrash /></n-icon>
              </n-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
