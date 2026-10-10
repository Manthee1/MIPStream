<script setup lang="ts">
/** @format */

import { computed, ref } from 'vue';
import { NButton, NIcon, NInput, NInputNumber, NText } from 'naive-ui';
import { IconPlus, IconTrash, IconX } from '@tabler/icons-vue';
import { widthMask } from '../../utils/bit-ops';
import {
  ControlConfig,
  ControlSignalDef,
  controlConfigWarnings,
  opcodeMask,
} from './logic';

const props = defineProps<{
  config: ControlConfig;
  designator?: string;
}>();

const emit = defineEmits<{
  (e: 'update:config', config: ControlConfig): void;
}>();

/** Structural deep copy (plain JSON data only). */
function clone(config: ControlConfig): ControlConfig {
  return {
    opcodeBits: config.opcodeBits,
    signals: config.signals.map((signal) => ({ ...signal })),
    rows: config.rows.map((row) => ({ ...row, values: { ...row.values } })),
  };
}

/**
 * Local working copy. Edits mutate it and the whole config is emitted on
 * every committed change; the applied config flows back only as a new prop
 * for a *different* instance (the host remounts the editor per designator).
 * Cell inputs are uncontrolled (default-value + change), mirroring
 * WordMemoryTable, so typing never re-renders mid-edit.
 */
const working = ref<ControlConfig>(clone(props.config));

const opcodeMax = computed(() => opcodeMask(working.value.opcodeBits));
const warnings = computed(() => controlConfigWarnings(working.value));

function signalMax(signal: ControlSignalDef): number {
  return widthMask(signal.bits);
}

/** Emits the committed working copy (cloned to detach shared references). */
function commit(): void {
  emit('update:config', clone(working.value));
}

// ------------------------------------------------------------ opcode width

function setOpcodeBits(value: number | null): void {
  if (value === null) return;
  working.value.opcodeBits = Math.min(12, Math.max(1, value));
  commit();
}

// ------------------------------------------------------------------ signals

function addSignal(): void {
  let n = working.value.signals.length + 1;
  let id = `sig${n}`;
  while (working.value.signals.some((signal) => signal.id === id)) id = `sig${++n}`;
  working.value.signals.push({ id, bits: 1 });
  commit();
}

function setSignalId(index: number, raw: string): void {
  const id = raw.trim();
  const signal = working.value.signals[index];
  if (!id || id === signal.id) return;
  // Migrate the opcode-table column so a rename keeps its values.
  for (const row of working.value.rows) {
    if (signal.id in row.values) {
      row.values[id] = row.values[signal.id];
      delete row.values[signal.id];
    }
  }
  signal.id = id;
  commit();
}

function setSignalBits(index: number, value: number | null): void {
  if (value === null) return;
  working.value.signals[index].bits = Math.min(32, Math.max(1, value));
  commit();
}

function removeSignal(index: number): void {
  const [signal] = working.value.signals.splice(index, 1);
  if (!signal) return;
  for (const row of working.value.rows) delete row.values[signal.id];
  commit();
}

// -------------------------------------------------------------------- rows

function addRow(): void {
  // Suggest the first unused opcode within the configured space.
  const used = new Set(working.value.rows.map((row) => row.opcode & opcodeMax.value));
  let opcode = 0;
  while (opcode < opcodeMax.value && used.has(opcode)) opcode++;
  working.value.rows.push({ opcode, values: {} });
  commit();
}

function setRowOpcode(index: number, value: number | null): void {
  if (value === null) return;
  working.value.rows[index].opcode = Math.min(opcodeMax.value, Math.max(0, value));
  commit();
}

function setRowLabel(index: number, raw: string): void {
  const label = raw.trim();
  if (label) working.value.rows[index].label = label;
  else delete working.value.rows[index].label;
  commit();
}

function setCellValue(rowIndex: number, signalId: string, value: number | null): void {
  if (value === null) return;
  const signal = working.value.signals.find((candidate) => candidate.id === signalId);
  if (!signal) return;
  const row = working.value.rows[rowIndex];
  row.values[signalId] = Math.min(signalMax(signal), Math.max(0, value));
  commit();
}

function removeRow(index: number): void {
  working.value.rows.splice(index, 1);
  commit();
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Opcode input width -->
    <div class="flex items-center gap-2">
      <n-text depth="3" class="text-xs w-20 shrink-0">Opcode bits</n-text>
      <n-input-number
        size="small"
        :default-value="working.opcodeBits"
        :min="1"
        :max="12"
        :update-value-on-input="false"
        class="w-24"
        @update:value="setOpcodeBits"
      />
    </div>

    <!-- Signal definitions -->
    <div class="flex flex-col gap-1">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Signals</n-text>
      <div v-for="(signal, index) in working.signals" :key="index" class="flex items-center gap-2">
        <n-input
          size="small"
          :default-value="signal.id"
          class="flex-1"
          placeholder="id"
          @change="(v: string) => setSignalId(index, v)"
        />
        <n-input-number
          size="small"
          :default-value="signal.bits"
          :min="1"
          :max="32"
          :show-button="false"
          :update-value-on-input="false"
          class="w-16"
          @update:value="(v: number | null) => setSignalBits(index, v)"
        />
        <n-button size="tiny" quaternary type="error" @click="removeSignal(index)">
          <n-icon :size="14"><IconX /></n-icon>
        </n-button>
      </div>
      <n-button size="tiny" dashed @click="addSignal">
        <template #icon><n-icon :size="14"><IconPlus /></n-icon></template>
        Add signal
      </n-button>
    </div>

    <!-- Opcode -> signal table -->
    <div class="flex flex-col gap-1">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Opcode Table</n-text>
      <div class="overflow-x-auto">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th class="border border-white/10 dark:border-white/5 px-1 py-0.5 w-20">Opcode</th>
              <th class="border border-white/10 dark:border-white/5 px-1 py-0.5">Label</th>
              <th
                v-for="signal in working.signals"
                :key="signal.id"
                class="border border-white/10 dark:border-white/5 px-1 py-0.5"
              >
                {{ signal.label || signal.id }}
              </th>
              <th class="border border-white/10 dark:border-white/5 px-1 py-0.5 w-8" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in working.rows" :key="index">
              <td class="border border-white/10 dark:border-white/5 p-0.5">
                <n-input-number
                  size="small"
                  :default-value="row.opcode"
                  :min="0"
                  :max="opcodeMax"
                  :show-button="false"
                  :update-value-on-input="false"
                  @update:value="(v: number | null) => setRowOpcode(index, v)"
                />
              </td>
              <td class="border border-white/10 dark:border-white/5 p-0.5">
                <n-input
                  size="small"
                  :default-value="row.label ?? ''"
                  @change="(v: string) => setRowLabel(index, v)"
                />
              </td>
              <td
                v-for="signal in working.signals"
                :key="signal.id"
                class="border border-white/10 dark:border-white/5 p-0.5"
              >
                <n-input-number
                  size="small"
                  :default-value="row.values[signal.id] ?? 0"
                  :min="0"
                  :max="signalMax(signal)"
                  :show-button="false"
                  :update-value-on-input="false"
                  @update:value="(v: number | null) => setCellValue(index, signal.id, v)"
                />
              </td>
              <td class="border border-white/10 dark:border-white/5 text-center">
                <n-button size="tiny" quaternary type="error" @click="removeRow(index)">
                  <n-icon :size="14"><IconTrash /></n-icon>
                </n-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <n-button size="tiny" dashed @click="addRow">
        <template #icon><n-icon :size="14"><IconPlus /></n-icon></template>
        Add opcode
      </n-button>
    </div>

    <!-- Config sanity warnings -->
    <div v-if="warnings.length > 0" class="flex flex-col gap-0.5">
      <n-text v-for="warning in warnings" :key="warning" type="warning" class="text-xs">
        {{ warning }}
      </n-text>
    </div>
  </div>
</template>
