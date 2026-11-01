<script setup lang="ts">
import DesignLayout from '../editor/layout/DesignLayout.vue';
import SimulateLayout from '../simulator/layout/SimulateLayout.vue';
import { useUIStore } from '../stores/UIStore';

// Project/perspective presence is enforced by the router guard (a workspace
// URL without a loadable project redirects to Home), so this component only
// picks the layout for the active perspective.
const uiStore = useUIStore();
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
