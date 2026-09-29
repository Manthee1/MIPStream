<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/UIStore';
import DesignLayout from '../editor/layout/DesignLayout.vue';
import SimulateLayout from '../simulator/layout/SimulateLayout.vue';

const router = useRouter();
const message = useMessage();
const projectStore = useProjectStore();
const uiStore = useUIStore();

onMounted(() => {
  if (!projectStore.currentProject) {
    message.warning('No project loaded. Redirecting to home...');
    router.push('/');
  }
});
</script>

<template>
  <div class="absolute inset-0 overflow-hidden">
    <DesignLayout v-if="uiStore.perspective === 'design'" />
    <SimulateLayout v-else />
  </div>
</template>

<style scoped>
/* Ensure the workspace takes up full available space minus TopBar */
.absolute {
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
</style>
