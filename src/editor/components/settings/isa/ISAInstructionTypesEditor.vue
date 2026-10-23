<script setup lang="ts">
/** @format */

import { NButton, NIcon, NInput, NSelect, NText } from 'naive-ui';
import { IconPlus, IconTrash } from '@tabler/icons-vue';
import type {
  AssemblerConfig,
  InstructionOperandConfig,
  InstructionTypeConfig,
  field_types,
} from '@/shared/types/isa';

const props = defineProps<{ isa: AssemblerConfig }>();

const FIELD_KIND_OPTIONS: { label: string; value: field_types }[] = [
  { label: 'Register', value: 'register' },
  { label: 'Raw value', value: 'raw_value' },
  { label: 'Label absolute', value: 'label_absolute' },
  { label: 'Label relative', value: 'label_relative' },
  { label: 'Memory address', value: 'memory_address' },
];

const fieldOptions = () =>
  props.isa.fields.map((field) => ({ label: field.label || field.field, value: field.field }));

function addType(): void {
  props.isa.instruction_types.push({
    type: `T${props.isa.instruction_types.length + 1}`,
    description: '',
    fields: [],
    default_field_values: {},
    default_operands: [],
  });
}

function removeType(index: number): void {
  const [removed] = props.isa.instruction_types.splice(index, 1);
  if (!removed) return;
  // Instructions that referenced the deleted type keep working but lose the link.
  for (const instruction of props.isa.instruction_set_config) {
    if (instruction.type === removed.type) instruction.type = undefined;
  }
}

function addDefaultValue(type: InstructionTypeConfig): void {
  type.default_field_values ??= {};
  const first = type.fields[0] ?? props.isa.fields[0]?.field;
  if (!first) return;
  if (type.default_field_values[first] === undefined) type.default_field_values[first] = 0;
}

function removeDefaultValue(type: InstructionTypeConfig, field: string): void {
  delete type.default_field_values?.[field];
}

function addDefaultOperand(type: InstructionTypeConfig): void {
  const first = type.fields[0] ?? props.isa.fields[0]?.field;
  if (!first) return;
  type.default_operands ??= [];
  type.default_operands.push([first]);
}
</script>

<template>
  <div class="flex flex-col gap-2 h-full">
    <div class="flex items-center justify-between">
      <div>
        <n-text strong class="text-sm">Instruction types</n-text>
        <n-text depth="3" class="block text-xs">Format families (e.g. R/I/J); new instructions prefill from their defaults.</n-text>
      </div>
      <n-button size="tiny" dashed @click="addType">
        <template #icon><n-icon :size="14"><IconPlus /></n-icon></template>
        Add type
      </n-button>
    </div>

    <n-text v-if="isa.instruction_types.length === 0" depth="3" class="text-xs">No instruction types yet.</n-text>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="(type, index) in isa.instruction_types"
        :key="index"
        class="border rounded px-2 py-1.5 flex flex-col gap-1.5"
      >
        <div class="flex items-center gap-2">
          <n-input
            size="small"
            class="w-20 shrink-0 font-mono"
            :value="type.type"
            @update:value="(value: string) => (type.type = value.trim())"
          />
          <n-input
            size="small"
            class="flex-1"
            placeholder="Description"
            :value="type.description"
            @update:value="(value: string) => (type.description = value)"
          />
          <n-button size="tiny" quaternary type="error" @click="removeType(index)">
            <n-icon :size="14"><IconTrash /></n-icon>
          </n-button>
        </div>

        <n-select
          size="small"
          multiple
          clearable
          placeholder="Fields used by this type"
          :value="type.fields"
          :options="fieldOptions()"
          :max-tag-count="6"
          @update:value="(value: string[]) => (type.fields = value)"
        />

        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <n-text depth="3" class="text-[10px] uppercase tracking-widest">Default field values</n-text>
              <n-button size="tiny" quaternary @click="addDefaultValue(type)">
                <n-icon :size="12"><IconPlus /></n-icon>
              </n-button>
            </div>
            <div v-for="(_, field) in type.default_field_values ?? {}" :key="field" class="flex items-center gap-1">
              <n-select
                size="tiny"
                class="flex-1"
                :value="String(field)"
                :options="fieldOptions()"
                @update:value="(value: string | number | null) => {
                  if (value === null) return;
                  const next = String(value);
                  const entries = Object.entries(type.default_field_values ?? {});
                  const current = entries.find(([key]) => key === field)?.[1] ?? 0;
                  type.default_field_values = Object.fromEntries(
                    entries.filter(([key]) => key !== field).concat([[next, current]]),
                  );
                }"
              />
              <n-input-number
                size="tiny"
                class="w-24"
                :show-button="false"
                :value="type.default_field_values?.[field]"
                @update:value="(value: number | null) => {
                  if (value === null) return;
                  type.default_field_values ??= {};
                  type.default_field_values[field as string] = value;
                }"
              />
              <n-button size="tiny" quaternary type="error" @click="removeDefaultValue(type, String(field))">
                <n-icon :size="12"><IconTrash /></n-icon>
              </n-button>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <n-text depth="3" class="text-[10px] uppercase tracking-widest">Default operands</n-text>
              <n-button size="tiny" quaternary @click="addDefaultOperand(type)">
                <n-icon :size="12"><IconPlus /></n-icon>
              </n-button>
            </div>
            <div
              v-for="(operand, operandIndex) in type.default_operands ?? []"
              :key="operandIndex"
              class="flex items-center gap-1"
            >
              <n-select
                size="tiny"
                class="flex-1"
                :value="operand[0]"
                :options="fieldOptions()"
                @update:value="(value: string | number | null) => value !== null && (type.default_operands![operandIndex] = [String(value), operand[1], operand[2]] as InstructionOperandConfig)"
              />
              <n-select
                size="tiny"
                class="w-28"
                :value="operand[1] ?? 'raw_value'"
                :options="FIELD_KIND_OPTIONS"
                @update:value="(value: string | number | null) => value !== null && (type.default_operands![operandIndex] = [operand[0], String(value) as field_types, operand[2]] as InstructionOperandConfig)"
              />
              <n-button size="tiny" quaternary type="error" @click="type.default_operands?.splice(operandIndex, 1)">
                <n-icon :size="12"><IconTrash /></n-icon>
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
