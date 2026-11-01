<script setup lang="ts">
/** @format */

import { computed, ref } from 'vue';
import { NButton, NIcon, NInput, NInputNumber, NSwitch, NText } from 'naive-ui';
import { IconPlus, IconX } from '@tabler/icons-vue';
import { clampWiringBits } from '../wiring-logic';
import {
  MAIN_PIN_ID,
  REGISTER_PIN_LIMIT,
  nextPinId,
  registerConfigWarnings,
  type RegisterConfig,
  type RegisterPin,
} from './logic';

const props = defineProps<{
  config: RegisterConfig;
  designator?: string;
}>();

const emit = defineEmits<{
  (e: 'update:config', config: RegisterConfig): void;
}>();

/** Structural deep copy (plain JSON data only), preserving managed fields. */
function clone(config: RegisterConfig): RegisterConfig {
  return {
    bitWidth: config.bitWidth,
    ...(config.managed ? { managed: true } : {}),
    ...(config.stageIndex !== undefined ? { stageIndex: config.stageIndex } : {}),
    ...(config.stageId !== undefined ? { stageId: config.stageId } : {}),
    ...(config.pins ? { pins: config.pins.map((pin) => ({ ...pin })) } : {}),
    ...(config.reset ? { reset: true } : {}),
    ...(config.portLabels ? { portLabels: { ...config.portLabels } } : {}),
  };
}

/**
 * Local working copy. Edits mutate it and the whole config is emitted on
 * every committed change; the applied config flows back only as a new prop
 * for a *different* instance (the host remounts the editor per designator).
 * Inputs are uncontrolled (default-value + change), mirroring the control
 * unit's editor, so typing never re-renders mid-edit.
 */
const working = ref<RegisterConfig>(clone(props.config));

// Legacy configs carry no `pins` key — seed the list with the implicit main
// pin so the first edit writes an explicit (equivalent) pin list.
if (!Array.isArray(working.value.pins) || working.value.pins.length === 0) {
  working.value.pins = [{ id: MAIN_PIN_ID, bits: clampWiringBits(working.value.bitWidth ?? 32) }];
}

const warnings = computed(() => registerConfigWarnings(working.value));

/** Emits the committed working copy (cloned to detach shared references). */
function commit(): void {
  emit('update:config', clone(working.value));
}

function setPinLabel(index: number, raw: string): void {
  const pin = working.value.pins?.[index];
  if (!pin) return;
  const label = raw.trim();
  if ((pin.label ?? '') === label) return;
  if (label) pin.label = label;
  else delete pin.label;
  commit();
}

function setPinBits(index: number, value: number | null): void {
  const pin: RegisterPin | undefined = working.value.pins?.[index];
  if (!pin || value === null) return;
  pin.bits = clampWiringBits(value);
  // Keep the legacy field coherent with the main pin for old readers.
  if (index === 0) working.value.bitWidth = pin.bits;
  commit();
}

function addPin(): void {
  if (!working.value.pins || working.value.pins.length >= REGISTER_PIN_LIMIT) return;
  const id = nextPinId(working.value.pins.map((pin) => pin.id));
  working.value.pins.push({ id, bits: 1 });
  commit();
}

/** Only non-main pins are removable — the main pair anchors legacy `d`/`q`. */
function removePin(index: number): void {
  if (index === 0) return;
  working.value.pins?.splice(index, 1);
  commit();
}

function toggleReset(value: boolean): void {
  working.value.reset = value;
  commit();
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Pin list -->
    <div class="flex flex-col gap-1">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Pins</n-text>
      <div v-for="(pin, index) in working.pins" :key="pin.id" class="flex items-center gap-1">
        <n-input
          size="small"
          class="flex-1"
          :default-value="pin.label ?? pin.id"
          :placeholder="index === 0 ? 'D / Q' : 'Name'"
          @change="(v: string) => setPinLabel(index, v)"
        />
        <n-input-number
          size="small"
          class="w-20 shrink-0"
          :default-value="pin.bits"
          :min="1"
          :max="32"
          :show-button="false"
          :update-value-on-input="false"
          @update:value="(v: number | null) => setPinBits(index, v)"
        />
        <n-button size="tiny" quaternary type="error" :disabled="index === 0" @click="removePin(index)">
          <n-icon :size="14"><IconX /></n-icon>
        </n-button>
      </div>
      <n-button
        size="tiny"
        dashed
        :disabled="(working.pins?.length ?? 0) >= REGISTER_PIN_LIMIT"
        @click="addPin"
      >
        <template #icon><n-icon :size="14"><IconPlus /></n-icon></template>
        Add pin
      </n-button>
      <n-text depth="3" class="text-xs">
        Each pin is an input/output pair that latches on the rising edge. The first pin is the
        main D/Q pair and cannot be removed.
      </n-text>
    </div>

    <!-- Reset pin -->
    <div class="flex flex-col gap-1">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Reset pin</n-text>
      <div class="flex items-center gap-2">
        <n-switch size="small" :value="working.reset === true" @update:value="toggleReset" />
        <n-text depth="3" class="text-xs">Synchronous — clears every pin to 0 on the rising edge.</n-text>
      </div>
    </div>

    <!-- Config sanity warnings -->
    <div v-if="warnings.length > 0" class="flex flex-col gap-0.5">
      <n-text v-for="warning in warnings" :key="warning" type="warning" class="text-xs">
        {{ warning }}
      </n-text>
    </div>
  </div>
</template>
