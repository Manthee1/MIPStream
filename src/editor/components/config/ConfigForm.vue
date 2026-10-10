<script setup lang="ts">
/** @format */

import { reactive } from 'vue';
import { NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch } from 'naive-ui';
import type { ModulePropertySchema } from '@/shared/types/manifest';

const props = defineProps<{
  schema: ModulePropertySchema[];
  config: Record<string, unknown>;
}>();

const emit = defineEmits<{
  (e: 'update', key: string, value: number | string | boolean): void;
}>();

/**
 * Uncommitted text drafts. Text fields commit on blur/Enter so the module
 * node is not rebuilt on every keystroke.
 */
const drafts = reactive<Record<string, string>>({});

function numberValue(field: ModulePropertySchema): number {
  const value = props.config[field.key] ?? field.default;
  return typeof value === 'number' ? value : 0;
}

function stringValue(field: ModulePropertySchema): string {
  const value = props.config[field.key] ?? '';
  return typeof value === 'string' ? value : String(value);
}

function booleanValue(field: ModulePropertySchema): boolean {
  const value = props.config[field.key] ?? field.default;
  return typeof value === 'boolean' ? value : Boolean(value);
}

function selectValue(field: ModulePropertySchema): string | number | null {
  const value = props.config[field.key] ?? field.default;
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

/**
 * Naive UI's select options accept an index signature; mapped literal objects
 * satisfy it while the schema's interface stays clean.
 */
interface NaiveSelectOption {
  label?: string;
  value?: string | number;
  [key: string]: unknown;
}

function selectOptions(field: ModulePropertySchema): NaiveSelectOption[] {
  return (field.options ?? []).map((option) => ({ label: option.label, value: option.value }));
}

function commitString(field: ModulePropertySchema): void {
  const draft = drafts[field.key];
  if (draft === undefined) return;
  delete drafts[field.key];
  if (draft !== stringValue(field)) emit('update', field.key, draft);
}

function commitNumber(field: ModulePropertySchema, value: number | null): void {
  // Ignore cleared inputs; the last valid value stays applied.
  if (value === null) return;
  let next = value;
  if (field.min !== undefined) next = Math.max(field.min, next);
  if (field.max !== undefined) next = Math.min(field.max, next);
  if (next !== props.config[field.key]) emit('update', field.key, next);
}

function commitBoolean(field: ModulePropertySchema, value: boolean): void {
  if (value !== props.config[field.key]) emit('update', field.key, value);
}

function commitOption(field: ModulePropertySchema, value: string | number): void {
  if (value !== props.config[field.key]) emit('update', field.key, value);
}
</script>

<template>
  <n-form size="small" label-placement="top" :show-feedback="false" class="flex flex-col gap-2">
    <n-form-item v-for="field in schema" :key="field.key" :label="field.label">
      <div class="w-full" :title="field.tooltip">
        <n-input-number
          v-if="field.type === 'number'"
          :value="numberValue(field)"
          :min="field.min"
          :max="field.max"
          :step="field.step"
          :update-value-on-input="false"
          class="w-full"
          @update:value="(v: number | null) => commitNumber(field, v)"
        />
        <n-input
          v-else-if="field.type === 'string'"
          :value="drafts[field.key] ?? stringValue(field)"
          :placeholder="field.placeholder"
          @update:value="(v: string) => (drafts[field.key] = v)"
          @blur="commitString(field)"
          @keydown.enter="commitString(field)"
        />
        <n-switch
          v-else-if="field.type === 'boolean'"
          :value="booleanValue(field)"
          @update:value="(v: boolean) => commitBoolean(field, v)"
        />
        <n-select
          v-else
          :value="selectValue(field)"
          :options="selectOptions(field)"
          @update:value="(v: string | number) => commitOption(field, v)"
        />
      </div>
    </n-form-item>
  </n-form>
</template>
