<script setup lang="ts">
/** @format */

import { computed, reactive, ref } from 'vue';
import { NButton, NIcon, NInput, NInputNumber, NText } from 'naive-ui';
import { IconArrowRight, IconPlus, IconX } from '@tabler/icons-vue';
import BitJumperEditor from '../../components/BitJumperEditor.vue';
import {
  clampWiringBits,
  cloneWiringFields,
  nextWiringFieldId,
  parseRangePreset,
  type WiringField,
} from '../wiring-logic';
import { resolveSplitterFields, splitterWarnings, type SplitterConfig } from './logic';

const props = defineProps<{
  config: SplitterConfig;
  designator?: string;
}>();

const emit = defineEmits<{
  (e: 'update:config', config: SplitterConfig): void;
}>();

/** Normalizes any (possibly legacy) config into a clean working copy. */
function clone(config: SplitterConfig): SplitterConfig {
  return {
    inputBits: clampWiringBits(config.inputBits),
    outputs: cloneWiringFields(resolveSplitterFields(config)),
  };
}

/**
 * Local working copy (ControlConfigEditor pattern): edits mutate it and the
 * whole config is emitted on every committed change; the applied config
 * flows back only as a new prop for a *different* instance.
 */
const working = ref<SplitterConfig>(clone(props.config));

const warnings = computed(() => splitterWarnings(working.value));

/** Emits the committed working copy (cloned to detach shared references). */
function commit(): void {
  emit('update:config', clone(working.value));
}

// ---------------------------------------------------------------- input bus

function setInputBits(value: number | null): void {
  if (value === null) return;
  working.value.inputBits = clampWiringBits(value);
  // Drop mappings that now point outside the bus.
  for (const field of working.value.outputs) {
    field.map = field.map.map((bit) => (bit >= 0 && bit < working.value.inputBits ? bit : -1));
  }
  commit();
}

// ------------------------------------------------------------------- fields

function addField(): void {
  working.value.outputs.push({
    id: nextWiringFieldId(working.value.outputs.map((field) => field.id)),
    bits: 1,
    map: [-1],
  });
  commit();
}

function setFieldLabel(index: number, raw: string): void {
  const field = working.value.outputs[index];
  if (!field) return;
  const label = raw.trim();
  if (label) field.label = label;
  else delete field.label;
  commit();
}

function setFieldBits(index: number, value: number | null): void {
  if (value === null) return;
  const field = working.value.outputs[index];
  if (!field) return;
  field.bits = clampWiringBits(value);
  field.map = field.map.slice(0, field.bits);
  while (field.map.length < field.bits) field.map.push(-1);
  commit();
}

function removeField(index: number): void {
  working.value.outputs.splice(index, 1);
  // Never leave the splitter with zero outputs — restart with a clean field.
  if (working.value.outputs.length === 0) {
    working.value.outputs.push({ id: nextWiringFieldId([]), bits: 1, map: [-1] });
  }
  commit();
}

/**
 * Applies a "hi:lo" preset: resizes the field and maps it contiguously.
 * Ranges wider than the bus are clamped to its top bits (never silently
 * dropped) and surface a warning notice on the field.
 */
function applyPreset(index: number, raw: string): void {
  const range = parseRangePreset(raw);
  if (!range) return;
  const field = working.value.outputs[index];
  if (!field) return;

  const busBits = working.value.inputBits;
  let { hi, lo } = range;
  let clamped = false;
  if (hi >= busBits) {
    hi = busBits - 1;
    clamped = true;
  }
  if (lo > hi) {
    lo = hi;
    clamped = true;
  }

  field.bits = hi - lo + 1;
  field.map = Array.from({ length: field.bits }, (_, i) => lo + i);

  if (clamped) {
    presetNotices[field.id] =
      `Range [${range.hi}:${range.lo}] exceeds the ${busBits}-bit bus — clamped to [${hi}:${lo}].`;
  } else {
    delete presetNotices[field.id];
  }
  commit();
}

/** Clamping notices for over-wide range presets, keyed by field id. */
const presetNotices = reactive<Record<string, string>>({});

/** Uncommitted range-preset drafts (applied on Enter / button click). */
const presetDrafts = reactive<Record<string, string>>({});

function applyPresetDraft(fieldId: string): void {
  const draft = presetDrafts[fieldId];
  if (draft === undefined) return;
  delete presetDrafts[fieldId];
  const index = working.value.outputs.findIndex((field) => field.id === fieldId);
  if (index === -1) return;
  applyPreset(index, draft);
}

/** Jumper-board edits arrive as a fresh field list. */
function updateFields(fields: WiringField[]): void {
  working.value.outputs = cloneWiringFields(fields);
  commit();
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Input bus width -->
    <div class="flex flex-col gap-1">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Input Bus</n-text>
      <n-input-number
        size="small"
        :value="working.inputBits"
        :min="1"
        :max="32"
        :show-button="false"
        :update-value-on-input="false"
        @update:value="setInputBits"
      />
    </div>

    <!-- Output fields -->
    <div class="flex flex-col gap-1">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Outputs</n-text>
      <div
        v-for="(field, index) in working.outputs"
        :key="field.id"
        class="flex flex-col gap-1 border border-white/10 dark:border-white/5 p-1.5"
      >
        <div class="flex items-center gap-1">
          <n-input
            size="small"
            :default-value="field.label ?? ''"
            placeholder="Label"
            @change="(v: string) => setFieldLabel(index, v)"
          />
          <n-input-number
            size="small"
            :default-value="field.bits"
            :min="1"
            :max="32"
            :show-button="false"
            :update-value-on-input="false"
            @update:value="(v: number | null) => setFieldBits(index, v)"
          />
          <n-button size="tiny" quaternary type="error" @click="removeField(index)">
            <n-icon :size="14"><IconX /></n-icon>
          </n-button>
        </div>
        <div class="flex items-center gap-1">
          <n-input
            size="small"
            placeholder="hi:lo"
            :default-value="presetDrafts[field.id] ?? ''"
            @update:value="(v: string) => (presetDrafts[field.id] = v)"
            @keydown.enter="applyPresetDraft(field.id)"
          />
          <n-button size="tiny" dashed @click="applyPresetDraft(field.id)">
            <n-icon :size="14"><IconArrowRight /></n-icon>
          </n-button>
        </div>
        <n-text v-if="presetNotices[field.id]" type="warning" class="text-xs">
          {{ presetNotices[field.id] }}
        </n-text>
      </div>
      <n-button size="tiny" dashed @click="addField">
        <template #icon><n-icon :size="14"><IconPlus /></n-icon></template>
        Add output
      </n-button>
    </div>

    <!-- Interactive jumper board -->
    <div class="flex flex-col gap-1">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Bit Wiring</n-text>
      <BitJumperEditor
        bus-label="In"
        :bus-bits="working.inputBits"
        :fields="working.outputs"
        bus-side="left"
        bus-fan-in-allowed
        @update:fields="updateFields"
      />
    </div>

    <!-- Config sanity warnings -->
    <div v-if="warnings.length > 0" class="flex flex-col gap-0.5">
      <n-text v-for="warning in warnings" :key="warning" type="warning" class="text-xs">
        {{ warning }}
      </n-text>
    </div>
  </div>
</template>

