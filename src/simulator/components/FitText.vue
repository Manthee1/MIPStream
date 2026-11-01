<script setup lang="ts">
/** @format */

import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

/**
 * Horizontally fit-scaled text: renders at natural size and shrinks via a
 * CSS transform when it would overflow its cell (task -4978: "the text
 * should scale to fit its cell"). Never grows above 1×. Re-fits on text
 * changes and container resizes.
 */
const props = defineProps<{ text: string }>();

const outer = ref<HTMLDivElement | null>(null);
const inner = ref<HTMLSpanElement | null>(null);
const scale = ref(1);

let observer: ResizeObserver | null = null;

onMounted(() => {
  observer = new ResizeObserver(() => fit());
  if (outer.value) observer.observe(outer.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

watch(() => props.text, fit);

function fit(): void {
  nextTick(() => {
    const outerEl = outer.value;
    const innerEl = inner.value;
    if (!outerEl || !innerEl) return;
    const available = outerEl.clientWidth;
    const needed = innerEl.offsetWidth;
    scale.value = needed > 0 ? Math.min(1, available / needed) : 1;
  });
}
</script>

<template>
  <div ref="outer" class="w-full h-full overflow-hidden">
    <span
      ref="inner"
      class="inline-block whitespace-nowrap origin-left font-mono text-xs text-primary"
      :style="{ transform: `scale(${scale})` }"
    >{{ text }}</span>
  </div>
</template>
