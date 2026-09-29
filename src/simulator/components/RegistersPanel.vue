<script setup lang="ts">
import { NDataTable } from 'naive-ui';

const columns = [
  { title: 'Reg', key: 'name', width: 80 },
  { title: 'Hex', key: 'hex' },
  { title: 'Dec', key: 'dec' },
];

const data = [
  { name: '$zero', hex: '00000000', dec: 0 },
  { name: '$at', hex: '00000000', dec: 0 },
  { name: '$v0', hex: '00000005', dec: 5 },
];
</script>

<template>
  <div class="h-full bg-surface">
    <n-data-table 
      :columns="columns" 
      :data="data" 
      size="small" 
      :bordered="false"
      class="h-full"
    />
  </div>
</template>

