<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, shallowRef, markRaw, nextTick, Teleport } from 'vue';
import {
  GoldenLayout,
  LayoutConfig,
} from 'golden-layout';
import 'golden-layout/dist/css/goldenlayout-base.css';
import '../../assets/golden-layout-theme.css';
import { setActiveLayout, type LayoutPerspective } from './layout-bridge';

const props = defineProps<{
  config: LayoutConfig;
  components: Record<string, any>;
  /**
   * Persistence key ('design' | 'simulate'). When set, the live arrangement
   * is registered in the layout bridge and emitted (debounced) as
   * `layout-change` for the project's per-perspective layout persistence.
   */
  layoutId?: LayoutPerspective;
}>();

const emit = defineEmits<{
  (e: 'layout-change', config: LayoutConfig): void;
}>();

const container = ref<HTMLElement | null>(null);
const goldenLayout = shallowRef<GoldenLayout | null>(null);
const teleports = ref<Array<{ id: string; component: any; container: HTMLElement }>>([]);

// Helper to create a unique ID for each component instance
let instanceCount = 0;

// ------------------------------------------------- layout-change emission

/** Serialized config of the last emission, to skip no-op notifications. */
let lastEmitted = '';
let emitTimer: number | null = null;
const EMIT_DEBOUNCE_MS = 500;

/** The current arrangement as a re-loadable config, or null when unavailable. */
function serializeState(): LayoutConfig | null {
  if (!goldenLayout.value) return null;
  try {
    return LayoutConfig.fromResolved(goldenLayout.value.saveLayout());
  } catch (error) {
    console.warn('Failed to serialize layout state:', error);
    return null;
  }
}

function captureInitialState(): void {
  const config = serializeState();
  if (config) lastEmitted = JSON.stringify(config);
}

function scheduleEmit(): void {
  if (!props.layoutId) return;
  if (emitTimer !== null) window.clearTimeout(emitTimer);
  emitTimer = window.setTimeout(() => {
    emitTimer = null;
    const config = serializeState();
    if (!config) return;
    const serialized = JSON.stringify(config);
    if (serialized === lastEmitted) return;
    lastEmitted = serialized;
    emit('layout-change', config);
  }, EMIT_DEBOUNCE_MS);
}

function emitFinalState(): void {
  if (!props.layoutId) return;
  const config = serializeState();
  if (!config) return;
  const serialized = JSON.stringify(config);
  if (serialized !== lastEmitted) emit('layout-change', config);
}

// ------------------------------------------------------------ lifecycle

const initGoldenLayout = () => {
  if (!container.value) return;

  goldenLayout.value = new GoldenLayout(container.value);

  // Register components
  Object.entries(props.components).forEach(([name, component]) => {
    // Golden Layout 2.x uses registerComponentFactoryFunction
    goldenLayout.value?.registerComponentFactoryFunction(name, (container, itemConfig) => {
      const id = `gl-${name}-${instanceCount++}`;
      const element = container.element;

      // Ensure the container has full height/width
      element.classList.add('h-full', 'w-full', 'overflow-hidden');

      teleports.value.push({
        id,
        component: markRaw(component),
        container: element,
      });

      container.on('destroy', () => {
        teleports.value = teleports.value.filter((t) => t.id !== id);
      });
    });
  });

  goldenLayout.value.loadLayout(props.config);

  if (props.layoutId) setActiveLayout(props.layoutId, goldenLayout.value);
  // User-driven state changes (drags, resizes, tab moves) → debounced emit.
  goldenLayout.value.on('stateChanged', scheduleEmit);
  // Baseline so the initial loadLayout never counts as a user arrangement.
  captureInitialState();

  window.addEventListener('resize', handleResize);
};

const handleResize = () => {
  if (container.value) {
    goldenLayout.value?.setSize(container.value.clientWidth, container.value.clientHeight);
  }
};

onMounted(() => {
  nextTick(() => {
    initGoldenLayout();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);

  // Persist the final arrangement synchronously before teardown — the
  // debounce timer would otherwise be lost along with the instance.
  emitFinalState();
  if (props.layoutId) setActiveLayout(props.layoutId, null);
  if (emitTimer !== null) {
    window.clearTimeout(emitTimer);
    emitTimer = null;
  }

  goldenLayout.value?.destroy();
});

defineExpose({
  goldenLayout
});
</script>

<template>
  <div ref="container" class="w-full h-full bg-app">
    <!-- Teleport all component instances into Golden Layout's containers -->
    <Teleport v-for="t in teleports" :key="t.id" :to="t.container">
      <component :is="t.component" />
    </Teleport>
  </div>
</template>

<style>
/* Golden Layout Overrides are handled in golden-layout-theme.css */
</style>

