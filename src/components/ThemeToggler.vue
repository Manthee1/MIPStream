<script setup lang="ts">
import useTheme from '@/composables/useTheme';
import { IconMoon, IconSun } from '@tabler/icons-vue';

const { isDark, toggleTheme } = useTheme()
</script>


<template>
    <button type="button" class="theme-toggler" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme">

        <IconMoon v-if="isDark" :size="20" />
        <IconSun v-else :size="20" />

    </button>
</template>

<style scoped>
.theme-toggler {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border: 0;
    border-radius: 9999px;
    background: transparent;
    color: currentColor;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.theme-toggler:hover {
    background: color-mix(in srgb, currentColor 10%, transparent);
}
</style>
