<script setup lang="ts">
import { darkTheme, NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, NGlobalStyle, NLayout, NThemeEditor } from 'naive-ui'
import { ref } from 'vue'
import useTheme from './composables/useTheme.ts'
import TopBar from './components/layout/TopBar.vue'
import CreateProjectModal from './components/projects/CreateProjectModal.vue'
import OpenProjectModal from './components/projects/OpenProjectModal.vue'
import { useUIStore } from './stores/UIStore'

const { isDark } = useTheme()
const uiStore = useUIStore()

const theme = ref(isDark ? darkTheme : null)

const lightThemeOverrides = {
  common: {
    baseColor: '#f8fafc',
    primaryColor: '#5a82d8',
    primaryColorHover: '#0284c7',
    primaryColorPressed: '#0369a1',
    primaryColorSuppl: '#0284c7',
    textColor1: '#0f172a',
    textColor2: '#334155',
    textColor3: '#64748b',
    textColorBase: '#0f172a',
    textColorDisabled: '#94a3b8',
    placeholderColor: '#94a3b8',
    tableColor: '#f1f5f9',
    cardColor: '#f1f5f9',
    modalColor: '#f1f5f9',
    bodyColor: '#f8fafc',
    tagColor: '#f1f5f9',
    invertedColor: '#0f172a',
    borderColor: '#e2e8f0',
    borderColorHover: '#cbd5e1',
    borderColorPressed: '#94a3b8',
    borderRadius: '0px',
    borderRadiusSmall: '0px',
  },
}

const darkThemeOverrides = {
  common: {
    baseColor: '#0f172a',
    primaryColor: '#0284c7',
    primaryColorHover: '#0369a1',
    primaryColorPressed: '#0284c7',
    primaryColorSuppl: '#0284c7',
    textColor1: '#f8fafc',
    textColor2: '#e2e8f0',
    textColor3: '#94a3b8',
    textColorBase: '#f8fafc',
    textColorDisabled: '#64748b',
    tableColor: '#1e293b',
    cardColor: '#1e293b',
    modalColor: '#1e293b',
    bodyColor: '#0f172a',
    tagColor: '#1e293b',
    invertedColor: '#f8fafc',
    placeholderColor: '#64748b',
    borderColor: '#334155',
    borderColorHover: '#475569',
    borderColorPressed: '#64748b',
    borderRadius: '0px',
    borderRadiusSmall: '0px',
  },
}
const themeOverrides = ref(isDark ? darkThemeOverrides : lightThemeOverrides)

window.addEventListener('theme-change', (event: any) => {
  theme.value = event.detail.theme === 'dark' ? darkTheme : null
  themeOverrides.value = event.detail.theme === 'dark' ? darkThemeOverrides : lightThemeOverrides
})
</script>

<template>
  <NConfigProvider :theme="theme" :theme-overrides="themeOverrides" inline-theme-disabled>
    <NGlobalStyle />
    <NThemeEditor>
    <NMessageProvider>
      <NNotificationProvider>
        <NDialogProvider>
          <NLayout class="h-screen flex flex-col overflow-hidden">
            <TopBar />
            <main class="flex-grow overflow-auto relative h-[calc(100%-2.5rem)]">
              <router-view />
            </main>
          </NLayout>

          <CreateProjectModal v-model:show="uiStore.showCreateProjectModal" />
          <OpenProjectModal v-model:show="uiStore.showOpenProjectModal" />
        </NDialogProvider>
      </NNotificationProvider>
    </NMessageProvider>
    </NThemeEditor>
  </NConfigProvider>
</template>
