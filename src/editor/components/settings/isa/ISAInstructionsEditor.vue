<script setup lang="ts">
/** @format */

import { NButton, NIcon, NInput, NSelect, NText } from 'naive-ui';
import { IconPlus, IconTrash } from '@tabler/icons-vue';
import type {
  AssemblerConfig,
  InstructionConfig,
  InstructionOperandConfig,
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

const typeOptions = () =>
  props.isa.instruction_types.map((type) => ({ label: type.type, value: type.type }));

function addInstruction(): void {
  const defaultType = props.isa.instruction_types[0];
  props.isa.instruction_set_config.push({
    mnemonic: `op${props.isa.instruction_set_config.length + 1}`,
    type: defaultType?.type,
    description: '',
    operands: defaultType ? (defaultType.default_operands ?? []).map((operand) => [...operand] as InstructionOperandConfig) : [],
    field_values: defaultType ? { ...(defaultType.default_field_values ?? {}) } : {},
  });
}

function removeInstruction(index: number): void {
  props.isa.instruction_set_config.splice(index, 1);
}

/** Switching the type prefills field values and operands from its defaults. */
function setInstructionType(index: number, type: string): void {
  const instruction = props.isa.instruction_set_config[index];
  if (!instruction) return;
  instruction.type = type;
  const definition = props.isa.instruction_types.find((entry) => entry.type === type);
  if (!definition) return;
  instruction.field_values = { ...(definition.default_field_values ?? {}) };
  instruction.operands = (definition.default_operands ?? []).map((operand) => [...operand] as InstructionOperandConfig);
}

function addFieldValue(instruction: InstructionConfig): void {
  const first = props.isa.fields[0]?.field;
  if (!first) return;
  instruction.field_values ??= {};
  if (instruction.field_values[first] === undefined) instruction.field_values[first] = 0;
}

function addOperand(instruction: InstructionConfig): void {
  const first = props.isa.fields[0]?.field;
  if (!first) return;
  instruction.operands.push([first]);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <div>
        <n-text strong class="text-sm">Instructions</n-text>
        <n-text depth="3" class="block text-xs">The concrete instruction set the assembler accepts.</n-text>
      </div>
      <n-button size="tiny" dashed @click="addInstruction">
        <template #icon><n-icon :size="14"><IconPlus /></n-icon></template>
        Add instruction
      </n-button>
    </div>

    <n-text v-if="isa.instruction_set_config.length === 0" depth="3" class="text-xs">No instructions yet.</n-text>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th class="border px-1.5 py-1 text-left w-28">Mnemonic</th>
            <th class="border px-1.5 py-1 text-left w-20">Type</th>
            <th class="border px-1.5 py-1 text-left">Field values</th>
            <th class="border px-1.5 py-1 text-left">Operands</th>
            <th class="border px-1.5 py-1 text-left">Description</th>
            <th class="border px-1.5 py-1 w-8" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(instruction, index) in isa.instruction_set_config" :key="index">
            <td class="border p-1">
              <n-input size="small" class="font-mono" :value="instruction.mnemonic" @update:value="(value: string) => (instruction.mnemonic = value.trim())" />
            </td>
            <td class="border p-1">
              <n-select
                size="small"
                :value="instruction.type ?? null"
                :options="typeOptions()"
                placeholder="—"
                @update:value="(value: string | number | null) => value !== null && setInstructionType(index, String(value))"
              />
            </td>
            <td class="border p-1 min-w-[14rem]">
              <div class="flex flex-col gap-1">
                <div v-for="(_, field) in instruction.field_values ?? {}" :key="field" class="flex items-center gap-1">
                  <n-select
                    size="tiny"
                    class="flex-1"
                    :value="String(field)"
                    :options="fieldOptions()"
                    @update:value="(value: string | number | null) => {
                      if (value === null) return;
                      const next = String(value);
                      const entries = Object.entries(instruction.field_values ?? {});
                      const current = entries.find(([key]) => key === field)?.[1] ?? 0;
                      instruction.field_values = Object.fromEntries(
                        entries.filter(([key]) => key !== field).concat([[next, current]]),
                      );
                    }"
                  />
                  <n-input-number
                    size="tiny"
                    class="w-24"
                    :show-button="false"
                    :value="instruction.field_values?.[field]"
                    @update:value="(value: number | null) => {
                      if (value === null) return;
                      instruction.field_values ??= {};
                      instruction.field_values[field as string] = value;
                    }"
                  />
                  <n-button size="tiny" quaternary type="error" @click="delete instruction.field_values?.[field]">
                    <n-icon :size="12"><IconTrash /></n-icon>
                  </n-button>
                </div>
                <n-button size="tiny" quaternary @click="addFieldValue(instruction)">
                  <n-icon :size="12"><IconPlus /></n-icon>
                </n-button>
              </div>
            </td>
            <td class="border p-1 min-w-[24rem]">
              <div class="flex flex-col gap-1">
                <div v-for="(operand, operandIndex) in instruction.operands" :key="operandIndex" class="flex items-center gap-1">
                  <n-select
                    size="tiny"
                    class="w-28"
                    :value="operand[0]"
                    :options="fieldOptions()"
                    @update:value="(value: string | number | null) => value !== null && (instruction.operands[operandIndex] = [String(value), operand[1], operand[2]] as InstructionOperandConfig)"
                  />
                  <n-select
                    size="tiny"
                    class="w-32"
                    :value="operand[1] ?? 'raw_value'"
                    :options="FIELD_KIND_OPTIONS"
                    @update:value="(value: string | number | null) => value !== null && (instruction.operands[operandIndex] = [operand[0], String(value) as field_types, operand[2]] as InstructionOperandConfig)"
                  />
                  <n-input
                    v-if="(operand[1] ?? 'raw_value') === 'memory_address'"
                    size="tiny"
                    class="w-24 font-mono"
                    placeholder="base reg"
                    :value="operand[2] ?? ''"
                    @update:value="(value: string) => (instruction.operands[operandIndex] = [operand[0], operand[1], value.trim()] as InstructionOperandConfig)"
                  />
                  <n-button size="tiny" quaternary type="error" @click="instruction.operands.splice(operandIndex, 1)">
                    <n-icon :size="12"><IconTrash /></n-icon>
                  </n-button>
                </div>
                <n-button size="tiny" quaternary @click="addOperand(instruction)">
                  <n-icon :size="12"><IconPlus /></n-icon>
                </n-button>
              </div>
            </td>
            <td class="border p-1">
              <n-input size="small" placeholder="Description" :value="instruction.description ?? ''" @update:value="(value: string) => (instruction.description = value)" />
            </td>
            <td class="border text-center">
              <n-button size="tiny" quaternary type="error" @click="removeInstruction(index)">
                <n-icon :size="14"><IconTrash /></n-icon>
              </n-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
