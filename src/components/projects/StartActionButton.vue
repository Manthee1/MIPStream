<script setup lang="ts">
import { NButton, NIcon, NSpace, NText } from 'naive-ui';
import type { Component } from 'vue';

defineProps<{
    icon: Component;
    title: string;
    description: string;
    iconContainerClass?: string;
}>();

defineEmits<{
    click: [];
}>();
</script>

<template>
    <n-button block secondary class="start-action-button py-4! px-2! rounded-none" size="large" @click="$emit('click')">
        <n-space align="center" class="w-full" :size="6">
            <div :class="['p-3 flex items-center justify-center', iconContainerClass]">
                <n-icon size="24">
                    <component :is="icon" />
                </n-icon>
            </div>
            <div class="text-left">
                <n-text strong class="text-lg">{{ title }}</n-text>
                <br />
                <n-text depth="3">{{ description }}</n-text>
            </div>
        </n-space>
    </n-button>
</template>

<style>
.start-action-button {
    height: auto;
}

:deep(.start-action-button) {
    height: auto;
    padding: 16px;
}

.start-action-button .n-button__content {
    width: 100%;
}
</style>
