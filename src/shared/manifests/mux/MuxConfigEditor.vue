<script setup lang="ts">
/** @format */

import { computed, ref } from 'vue';
import { NInputNumber, NRadioButton, NRadioGroup, NSelect, NTag, NText } from 'naive-ui';
import { muxSelBits, muxSelCode, resolveMuxSelMap, type MuxConfig } from './logic';

const props = defineProps<{
  config: MuxConfig;
  designator?: string;
}>();

const emit = defineEmits<{
  (e: 'update:config', config: MuxConfig): void;
}>();

/**
 * Working-copy shape: `selMap` is always a resolved array here (the config
 * schema keeps it optional for legacy instances).
 */
interface MuxWorkingConfig extends Omit<MuxConfig, "selMap"> {
  selMap: number[];
}

/** Normalizes any (possibly legacy) config into a clean working copy. */
function clone(config: MuxConfig): MuxWorkingConfig {
  const numInputs = Math.max(2, Math.floor(config.numInputs) || 2);
  return {
    bitWidth: Math.min(32, Math.max(1, Math.floor(config.bitWidth) || 32)),
    numInputs,
    selMap: [...resolveMuxSelMap(config.selMap, numInputs)],
    selPosition: config.selPosition === 'top' ? 'top' : 'bottom',
  };
}

/**
 * Local working copy (control-unit editor pattern): edits mutate it and the
 * whole config is emitted on every committed change; the applied config
 * flows back only as a new prop for a *different* instance.
 */
const working = ref<MuxWorkingConfig>(clone(props.config));

const selBits = computed(() => muxSelBits(working.value.numInputs));

/** Binary selector-code options ("0", "1", "00", "01", ...). */
const selOptions = computed(() =>
  Array.from({ length: working.value.numInputs }, (_, value) => ({
    label: muxSelCode(value, selBits.value),
    value,
  }))
);

/** Emits the committed working copy (cloned to detach shared references). */
function commit(): void {
  emit('update:config', clone(working.value));
}

// -------------------------------------------------------------- data width

/** Input indices in port order (0..numInputs-1), for the row list below. */
const inputIndices = computed(() =>
  Array.from({ length: working.value.numInputs }, (_, inputIndex) => inputIndex)
);

function setBitWidth(value: number | null): void {
  if (value === null) return;
  working.value.bitWidth = Math.min(32, Math.max(1, value));
  commit();
}

// -------------------------------------------------------- selector position

function setSelPosition(value: string): void {
  const next = value === 'top' ? 'top' : 'bottom';
  if (working.value.selPosition === next) return;
  working.value.selPosition = next;
  commit();
}

// ------------------------------------------------------------- input rows

/**
 * Assigns a selector code to an input. Codes are a permutation, so picking
 * an already-used code swaps it with the input that held it — the config
 * can never enter an invalid state.
 */
function setAssignment(inputIndex: number, selValue: number): void {
  const selMap = working.value.selMap;
  if (selMap[inputIndex] === selValue) return;
  const other = selMap.indexOf(selValue);
  if (other >= 0) selMap[other] = selMap[inputIndex];
  selMap[inputIndex] = selValue;
  commit();
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Data bus width -->
    <div class="flex flex-col gap-1">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Data Bus</n-text>
      <n-input-number
        size="small"
        :value="working.bitWidth"
        :min="1"
        :max="32"
        :show-button="false"
        :update-value-on-input="false"
        @update:value="setBitWidth"
      />
    </div>

    <!-- Selector position -->
    <div class="flex flex-col gap-1">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Selector Position</n-text>
      <n-radio-group
        size="small"
        :value="working.selPosition"
        @update:value="(v: string) => setSelPosition(v)"
      >
        <n-radio-button value="bottom">Bottom</n-radio-button>
        <n-radio-button value="top">Top</n-radio-button>
      </n-radio-group>
      <n-text depth="3" class="text-xs">
        The Sel pin hangs below or above the data inputs.
      </n-text>
    </div>

    <!-- Input assignment (rows in drawn stacking order, top first) -->
    <div class="flex flex-col gap-1">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Inputs</n-text>
      <div v-for="inputIndex in inputIndices" :key="inputIndex" class="flex items-center gap-1">
        <n-tag size="small" :bordered="false" class="shrink-0 font-mono">In {{ inputIndex }}</n-tag>
        <n-select
          size="small"
          class="w-24"
          :value="working.selMap[inputIndex]"
          :options="selOptions"
          @update:value="(v: number) => setAssignment(inputIndex, v)"
        />
      </div>
      <n-text depth="3" class="text-xs">
        Each input forwards on the selector code beside it (also drawn next to its pin). Picking an
        occupied code swaps the two inputs.
      </n-text>
    </div>
  </div>
</template>
