<script setup lang="ts">
/** @format */
import WordMemoryTable from "../../components/WordMemoryTable.vue";
import type { ModulePanelProps } from "../../types/manifest";
import type { InstructionMemoryConfig } from "./index";
import type { WordMemoryState } from "../word-memory";

defineProps<ModulePanelProps<InstructionMemoryConfig, WordMemoryState>>();
defineEmits<{ (e: "update"): void }>();
</script>

<template>
  <WordMemoryTable
    :words="state.words"
    :bit-width="config.bitWidth"
    :revision="revision"
    @update="$emit('update')"
  />
</template>
