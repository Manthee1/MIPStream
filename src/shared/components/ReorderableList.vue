<script setup lang="ts" generic="T">
/** @format */

import { ref, watch, type Ref } from 'vue';
import { NIcon } from 'naive-ui';
import { IconGripVertical } from '@tabler/icons-vue';
import { useDraggable } from 'vue-draggable-plus';

/**
 * Grip-handle drag-and-drop row list for Inspector editors, backed by
 * Sortable.js via `useDraggable` (vue-draggable-plus). The host owns the row
 * content through the default slot; this wrapper owns the handle, animation
 * and the emission contract: every completed drag emits the reordered rows
 * as a fresh array (`update:modelValue`) plus a `reorder` nudge — the host
 * commits exactly once per drop, so each drag is one undo entry.
 *
 * Only the grip starts a drag (`handle: ".drag-handle"`), so the row's
 * inputs and selects keep their normal click/selection behavior.
 */
const props = defineProps<{
  modelValue: T[];
  /** Row key resolver — must be stable across reorders (ids, never indexes). */
  itemKey: (item: T, index: number) => string | number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: T[]): void;
  (e: 'reorder'): void;
}>();

/**
 * Local mirror of the host's rows. Kept in sync (deeply — hosts mutate their
 * working arrays in place for adds/edits) and reordered by the sortable; the
 * host state is only ever replaced through `update:modelValue`.
 */
const rows = ref<T[]>([...(props.modelValue ?? [])]) as Ref<T[]>;
watch(
  () => props.modelValue,
  (value) => {
    rows.value = [...(value ?? [])];
  },
  { deep: true }
);

const root = ref<HTMLElement | null>(null);

useDraggable(root, rows, {
  animation: 150,
  handle: '.drag-handle',
  onUpdate: () => {
    emit('update:modelValue', [...rows.value]);
    emit('reorder');
  },
});
</script>

<template>
  <div ref="root" class="flex flex-col gap-1">
    <div
      v-for="(item, index) in rows"
      :key="itemKey(item, index)"
      class="flex items-center gap-1 [&.sortable-ghost]:opacity-40"
    >
      <span
        class="drag-handle flex cursor-grab items-center opacity-50 select-none hover:opacity-100 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <n-icon :size="14"><IconGripVertical /></n-icon>
      </span>
      <slot :item="item" :index="index" />
    </div>
  </div>
</template>
