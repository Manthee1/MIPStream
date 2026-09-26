<script setup lang="ts">
import { darkTheme, NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, NThemeEditor, NButton, NGlobalStyle } from 'naive-ui'
import { computed, ref } from 'vue'
import ThemeToggler from './components/ThemeToggler.vue'
import useTheme from './composables/useTheme.ts'

const { isDark } = useTheme()

const theme = ref(isDark ? darkTheme : null)


const lightThemeOverrides = {
  common: {
    primaryColor: '#5a82d8',
    primaryColorHover: '#0284c7',
    primaryColorPressed: '#0369a1',
    primaryColorSuppl: '#0284c7',
    textColor1: '#0f172a',
    textColor2: '#334155',
    textColor3: '#64748b',
    textColorDisabled: '#94a3b8',
    placeholderColor: '#94a3b8',
    borderColor: '#e2e8f0',
    borderColorHover: '#cbd5e1',
    borderColorPressed: '#94a3b8',
  },
}

const darkThemeOverrides = {
  common: {
    primaryColor: '#0284c7',
    primaryColorHover: '#0369a1',
    primaryColorPressed: '#0284c7',
    primaryColorSuppl: '#0284c7',
    textColor1: '#f8fafc',
    textColor2: '#e2e8f0',
    textColor3: '#94a3b8',
    textColorDisabled: '#64748b',
    placeholderColor: '#64748b',
    borderColor: '#334155',
    borderColorHover: '#475569',
    borderColorPressed: '#64748b',
  },
}
const themeOverrides = ref(isDark ? darkThemeOverrides : lightThemeOverrides)

window.addEventListener('theme-change', (event: any) => {
  console.log('Theme changed to:', event.detail.theme)

  theme.value = event.detail.theme === 'dark' ? darkTheme : null
  themeOverrides.value = event.detail.theme === 'dark' ? darkThemeOverrides : lightThemeOverrides
})


</script>

<template>
  <NConfigProvider :theme="theme" :theme-overrides="themeOverrides" inline-theme-disabled>
    <NMessageProvider>
      <NNotificationProvider>
        <NDialogProvider>
          <NThemeEditor />
          <!-- <NButton @click="theme = !isDark ? darkTheme : null">Toggle Theme</NButton> -->
          <main class="min-h-screen font-sans antialiased">
            <ThemeToggler />
            <router-view />
          </main>
        </NDialogProvider>
      </NNotificationProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
