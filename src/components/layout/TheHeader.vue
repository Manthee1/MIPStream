<script setup lang="ts">
import { computed, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  NLayoutHeader, NSpace, NDropdown, NButton, NIcon, NText, 
  NDivider, useMessage 
} from 'naive-ui';
import { 
  IconCpu, IconPlus, IconFolderOpen,
  IconDeviceFloppy, IconHistory, IconLogout, IconSettings,
  IconSun, IconMoon, IconAdjustments, IconPlayerPlay, IconTool
} from '@tabler/icons-vue';
import { useUIStore } from '../../stores/UIStore';
import { useProjectStore } from '../../stores/projectStore';
import useTheme from '../../composables/useTheme';

const uiStore = useUIStore();
const projectStore = useProjectStore();
const router = useRouter();
const route = useRoute();
const message = useMessage();
const { isDark, toggleTheme } = useTheme();

const isWorkspace = computed(() => route.path === '/workspace');
const currentProjectName = computed(() => projectStore.currentProject?.name || 'No Project');

const handleFileMenu = (key: string) => {
  if (key === 'new') uiStore.showCreateProjectModal = true;
  else if (key === 'open') uiStore.showOpenProjectModal = true;
  else if (key === 'save' && projectStore.currentProject) {
    projectStore.saveProject().then(() => message.success('Project saved')).catch(() => message.error('Failed to save project'));
  } else if (key === 'exit') router.push('/');
};

const handleViewMenu = (key: string) => {
  if (key === 'theme') toggleTheme();
  else if (key === 'perspective-design') uiStore.perspective = 'design';
  else if (key === 'perspective-simulate') uiStore.perspective = 'simulate';
  else if (key === 'settings') uiStore.openGeneralSettings();
};

const fileOptions = computed(() => [
  { label: 'New Project', key: 'new', icon: () => h(NIcon, null, { default: () => h(IconPlus) }) },
  { label: 'Open Project', key: 'open', icon: () => h(NIcon, null, { default: () => h(IconFolderOpen) }) },
  {
    label: 'Recent Projects', key: 'recent', icon: () => h(NIcon, null, { default: () => h(IconHistory) }),
    children: projectStore.recentProjects.map(p => ({
      label: p.name, key: `recent-${p.id}`,
      props: { onClick: () => { projectStore.setCurrentProject(p); router.push('/workspace'); } }
    }))
  },
  { type: 'divider', key: 'd1' },
  { label: 'Save Project', key: 'save', disabled: !projectStore.currentProject, icon: () => h(NIcon, null, { default: () => h(IconDeviceFloppy) }) },
  { type: 'divider', key: 'd2' },
  { label: 'Exit', key: 'exit', icon: () => h(NIcon, null, { default: () => h(IconLogout) }) }
]);

const editOptions = [
  { label: 'Undo', key: 'undo', disabled: true },
  { label: 'Redo', key: 'redo', disabled: true },
  { type: 'divider', key: 'd1' },
  { label: 'Cut', key: 'cut', disabled: true },
  { label: 'Copy', key: 'copy', disabled: true },
  { label: 'Paste', key: 'paste', disabled: true },
];

const viewOptions = computed(() => [
  {
    label: 'Perspective', key: 'perspective', icon: () => h(NIcon, null, { default: () => h(IconAdjustments) }),
    children: [
      { label: 'Design', key: 'perspective-design', icon: () => h(NIcon, null, { default: () => h(IconTool) }), disabled: uiStore.perspective === 'design' },
      { label: 'Simulate', key: 'perspective-simulate', icon: () => h(NIcon, null, { default: () => h(IconPlayerPlay) }), disabled: uiStore.perspective === 'simulate' }
    ]
  },
  { type: 'divider', key: 'd1' },
  { label: isDark.value ? 'Light Mode' : 'Dark Mode', key: 'theme', icon: () => h(NIcon, null, { default: () => h(isDark.value ? IconSun : IconMoon) }) },
  { label: 'Settings', key: 'settings', icon: () => h(NIcon, null, { default: () => h(IconSettings) }) }
]);

const helpOptions = [
  { label: 'Documentation', key: 'docs', props: { onClick: () => uiStore.openHelp() } },
  { label: 'About', key: 'about' }
];
</script>

<template>
  <n-layout-header bordered class="h-10 flex items-center px-2 select-none z-50">
    <div class="flex items-center gap-2 mr-4 cursor-pointer" @click="router.push('/')">
      <n-icon size="20" class="text-primary"><IconCpu /></n-icon>
      <n-text strong class="text-sm tracking-tight">MIPStream</n-text>
    </div>
    <n-space :size="4" align="center">
      <n-dropdown :options="fileOptions" @select="handleFileMenu" trigger="click" placement="bottom-start">
        <n-button quaternary size="tiny" class="px-2">File</n-button>
      </n-dropdown>
      <n-dropdown :options="editOptions" trigger="click" placement="bottom-start">
        <n-button quaternary size="tiny" class="px-2">Edit</n-button>
      </n-dropdown>
      <n-dropdown :options="viewOptions" @select="handleViewMenu" trigger="click" placement="bottom-start">
        <n-button quaternary size="tiny" class="px-2">View</n-button>
      </n-dropdown>
      <n-dropdown :options="helpOptions" trigger="click" placement="bottom-start">
        <n-button quaternary size="tiny" class="px-2">Help</n-button>
      </n-dropdown>
    </n-space>
    <div class="flex-grow flex justify-center pointer-events-none">
      <n-text depth="3" class="text-xs font-medium">{{ currentProjectName }}{{ projectStore.projectSaved ? '' : '*' }}</n-text>
    </div>
    <n-space :size="8" align="center" class="ml-auto">
      <n-text v-if="isWorkspace" depth="3" class="text-[10px] uppercase tracking-widest font-bold">{{ uiStore.perspective }} mode</n-text>
      <n-divider vertical />
      <n-button quaternary size="tiny" @click="toggleTheme" class="px-1">
        <n-icon size="16"><IconSun v-if="isDark" /><IconMoon v-else /></n-icon>
      </n-button>
    </n-space>
  </n-layout-header>
</template>

<style scoped>
.n-layout-header { background-color: var(--bg-surface); }
:deep(.n-button) { border-radius: 0; }
</style>
