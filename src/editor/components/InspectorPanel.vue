<script setup lang="ts">
import { NText, NEmpty } from 'naive-ui';
</script>

<template>
  <div class="h-full flex flex-col bg-surface">
    <div class="p-4 border-b border-white/10 dark:border-white/5">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Inspector</n-text>
    </div>
    <div class="flex-1 flex items-center justify-center p-8">
      <n-empty description="Select a component to view properties" />
    </div>
  </div>
</template>

