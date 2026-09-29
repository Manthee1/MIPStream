<script setup lang="ts">
import { NText } from 'naive-ui';
</script>

<template>
  <div class="h-full bg-app flex flex-col items-center justify-center">
    <n-text depth="3" class="text-[10px] uppercase font-mono mb-4 opacity-50">MIPS Assembly Editor</n-text>
    <div class="text-primary opacity-30 font-mono text-sm">
      .text<br/>
      main: addi $t0, $zero, 5<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;jr $ra
    </div>
  </div>
</template>

