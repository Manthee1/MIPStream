<script setup lang="ts">
import { ConfigProvider } from 'radix-vue'
</script>

<template>
  <ConfigProvider>
    <div class="min-h-screen bg-surface-0 text-slate-900 dark:text-slate-100 font-sans antialiased">
      <router-view />
    </div>
  </ConfigProvider>
</template>

