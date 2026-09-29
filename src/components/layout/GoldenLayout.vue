<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, shallowRef, markRaw, nextTick, Teleport, watch } from 'vue';
import {
  GoldenLayout,
  LayoutConfig,
} from 'golden-layout';
import 'golden-layout/dist/css/goldenlayout-base.css';
import '../../assets/golden-layout-theme.css';

const props = defineProps<{
  config: LayoutConfig;
  components: Record<string, any>;
}>();

const container = ref<HTMLElement | null>(null);
const goldenLayout = shallowRef<GoldenLayout | null>(null);
const teleports = ref<Array<{ id: string; component: any; container: HTMLElement }>>([]);

// Helper to create a unique ID for each component instance
let instanceCount = 0;

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
  goldenLayout.value?.destroy();
});

watch(() => props.config, () => {
    // Basic implementation: reload layout if needed
}, { deep: true });

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

