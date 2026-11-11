<script setup lang="ts">
import { computed, h, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NLayoutHeader, NSpace, NDropdown, NButton, NIcon, NText, NDivider, NButtonGroup, useMessage } from 'naive-ui';
import { IconPlus, IconFolderOpen, IconDeviceFloppy, IconHistory, IconLogout, IconSettings, IconSun, IconMoon, IconAdjustments, IconPlayerPlay, IconPlayerPause, IconTool, IconPlayerStop, IconPlayerSkipForward, IconSettings2, IconDatabaseImport, IconRestore, IconArrowUp, IconTemplate, IconFileExport, IconFileImport } from '@tabler/icons-vue';
import { useUIStore } from '../../stores/UIStore';
import { useProjectStore } from '../../stores/projectStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSimulationStore } from '../../stores/simulationStore';
import { useSimulation } from '../../composables/useSimulation';
import useTheme from '../../composables/useTheme';
import { useProjectSave } from '../../composables/useProjectSave';
import { useArchitectureTransfer } from '../../composables/useArchitectureTransfer';
import { useProjectSwitch } from '../../composables/useProjectSwitch';
import { autosaveError, lastAutosavedAt } from '../../composables/useAutosave';
import { useKeyboard } from '../../composables/useKeyboard';

const uiStore = useUIStore();
const projectStore = useProjectStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const route = useRoute();
const message = useMessage();
const { isDark, toggleTheme } = useTheme();

const { saveCurrentProject } = useProjectSave();
const { openProject } = useProjectSwitch();
// Architecture transfer flows (File ▸ template / export / import).
const { openSaveAsTemplate, exportArchitecture, importArchitecture } = useArchitectureTransfer();
const { setShortcut, removeShortcut } = useKeyboard();

// Simulation controls (Simulate perspective only).
const simulationStore = useSimulationStore();
const {
  startProgram: startSimulation,
  pauseProgram: pauseSimulation,
  stopProgram: stopSimulation,
  stepProgram: stepSimulation,
  loadProgram: loadSimulation,
  restartProgram: restartSimulation,
} = useSimulation();

const isRunning = computed(() => simulationStore.status === 'running');
const canHalt = computed(() => ['paused', 'running', 'finished'].includes(simulationStore.status));
// Restart requires a loaded program (SIMULATOR_OVERVIEW §4 control table).
const canRestart = computed(() => ['paused', 'running', 'finished'].includes(simulationStore.status));

const notifySimulationErrors = () => {
  if (simulationStore.compileErrors.length > 0) {
    message.error(`Cannot simulate: ${simulationStore.compileErrors[0]}`);
  } else if (simulationStore.assemblerDiagnostics.length > 0) {
    const first = simulationStore.assemblerDiagnostics[0];
    message.error(`Assembly error (line ${first.line}): ${first.message}`);
  } else if (simulationStore.loadErrors.length > 0) {
    message.error(simulationStore.loadErrors[0]);
  }
};

const projectHasAtLeastOneEditor = computed(() => {
  return (projectStore.currentProject?.software.editors?.length ?? 0) > 0;
});

const handleRun = () => {
  if (!startSimulation()) notifySimulationErrors();
};

const handleStep = () => {
  if (!stepSimulation()) notifySimulationErrors();
};

const handleLoad = () => {
  if (!loadSimulation()) notifySimulationErrors();
};

const handleRestart = () => {
  if (!restartSimulation()) notifySimulationErrors();
};

// Global save shortcut: Ctrl+S (Windows/Linux) and Cmd+S (macOS). Registered
// here so it also works outside the workspace (e.g. the "no project" notice).
onMounted(() => {
  setShortcut('CTRL S', () => { void saveCurrentProject(); }, 'Save Project', 'Saves the current project.');
  setShortcut('META S', () => { void saveCurrentProject(); }, 'Save Project', 'Saves the current project.');
});
onUnmounted(() => {
  removeShortcut('CTRL S');
  removeShortcut('META S');
});

const hasProject = computed(() => !!projectStore.currentProject);
const isWorkspace = computed(() => route.path === '/workspace' || route.path.startsWith('/workspace/'));
const currentProjectName = computed(() => projectStore.currentProject?.name || 'No Project');

const handleFileMenu = (key: string) => {
  if (key === 'new') uiStore.showCreateProjectModal = true;
  else if (key === 'open') uiStore.showOpenProjectModal = true;
  else if (key === 'save') {
    void saveCurrentProject();
  } else if (key === 'save-template') {
    openSaveAsTemplate();
  } else if (key === 'export-architecture') {
    void exportArchitecture();
  } else if (key === 'import-architecture') {
    void importArchitecture();
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
      props: { onClick: () => { void openProject(p); } }
    }))
  },
  { type: 'divider', key: 'd1' },
  { label: 'Save Project', key: 'save', disabled: !hasProject.value, icon: () => h(NIcon, null, { default: () => h(IconDeviceFloppy) }) },
  { type: 'divider', key: 'd2' },
  // Architecture transfer actions need an open project in the workspace:
  // exports snapshot the live document, imports replace it in place.
  {
    label: 'Save Architecture as Template…', key: 'save-template',
    disabled: !hasProject.value || !isWorkspace.value,
    icon: () => h(NIcon, null, { default: () => h(IconTemplate) })
  },
  {
    label: 'Export Architecture…', key: 'export-architecture',
    disabled: !hasProject.value || !isWorkspace.value,
    icon: () => h(NIcon, null, { default: () => h(IconFileExport) })
  },
  {
    label: 'Import Architecture…', key: 'import-architecture',
    disabled: !hasProject.value || !isWorkspace.value,
    icon: () => h(NIcon, null, { default: () => h(IconFileImport) })
  },
  { type: 'divider', key: 'd3' },
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
    label: 'Perspective', key: 'perspective', disabled: !hasProject.value, icon: () => h(NIcon, null, { default: () => h(IconAdjustments) }),
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

const handleSave = () => { void saveCurrentProject(); };

// Autosave status hint next to the project title (workspace only).
const autosaveStatus = computed(() => {
  if (!hasProject.value || !isWorkspace.value || !settingsStore.autoSave) return null;
  if (autosaveError.value) return { text: autosaveError.value, error: true };
  if (lastAutosavedAt.value) {
    return {
      text: `Saved ${lastAutosavedAt.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      error: false,
    };
  }
  return null;
});
</script>


<template>
  <n-layout-header bordered class="h-10 grid grid-cols-[1fr_auto_1fr] items-center px-2 select-none z-50">
    <!-- Left Section -->
    <div class="flex items-center gap-2 min-w-0">
      <div class="flex items-center gap-2 mr-2 shrink-0 cursor-pointer" @click="router.push('/')">
        <img src="../../logo.svg" class="w-5 h-5" alt="Logo" />
        <!-- <n-text strong class="text-sm tracking-tight">MIPStream</n-text> -->
      </div>
      <n-space :size="4" align="center" class="shrink-0">
        <n-dropdown :options="fileOptions" @select="handleFileMenu" trigger="click" placement="bottom-start"><n-button
            quaternary size="tiny" class="px-2">File</n-button></n-dropdown>
        <n-dropdown :options="editOptions" trigger="click" placement="bottom-start"><n-button quaternary size="tiny"
            class="px-2">Edit</n-button></n-dropdown>
        <n-dropdown :options="viewOptions" @select="handleViewMenu" trigger="click" placement="bottom-start"><n-button
            quaternary size="tiny" class="px-2">View</n-button></n-dropdown>
        <n-dropdown :options="helpOptions" trigger="click" placement="bottom-start"><n-button quaternary size="tiny"
            class="px-2">Help</n-button></n-dropdown>
      </n-space>
    </div>

    <!-- Center Section -->
    <div class="flex justify-center min-w-0 px-4 items-baseline">
      <n-text depth="3" class="text-xs font-medium truncate max-w-[40vw]">
        {{ currentProjectName }}{{ projectStore.projectSaved ? '' : '*' }}
      </n-text>
      <n-text v-if="autosaveStatus" :type="autosaveStatus.error ? 'error' : 'default'" depth="3"
        class="text-xs ml-2 shrink-0 tabular-nums">
        {{ autosaveStatus.text }}
      </n-text>
    </div>

    <!-- Right Section -->
    <div class="flex items-center justify-end gap-2 min-w-0">
      <div class="flex items-center gap-2 shrink-0">



        <!-- Workspace Specific Simulation Controls -->
        <n-space :size="4" v-if="hasProject && isWorkspace && uiStore.perspective === 'simulate'" align="center">
          <n-button v-if="projectHasAtLeastOneEditor" quaternary circle size="tiny" type="info" title="Assemble and Load (F7)"
            @click="handleLoad">
            <template #icon><n-icon>
                <IconDatabaseImport />
              </n-icon></template>
          </n-button>
          <!-- If no editors then no code and no assembling required, change language to Initialize from Startup -->
          <n-button v-else quaternary circle size="tiny" type="info" title="Initialize (F7)" @click="handleLoad">
            <template #icon><n-icon>
                <IconArrowUp />
              </n-icon></template>
          </n-button>
          <n-divider vertical />


          <n-button quaternary circle size="tiny" type="success" :disabled="isRunning" title="Run (F5)"
            @click="handleRun">
            <template #icon><n-icon>
                <IconPlayerPlay />
              </n-icon></template>
          </n-button>
          <n-button quaternary circle size="tiny" :disabled="!isRunning" title="Pause (F6)" @click="pauseSimulation">
            <template #icon><n-icon>
                <IconPlayerPause />
              </n-icon></template>
          </n-button>
          <n-button quaternary circle size="tiny" type="error" :disabled="!canHalt" title="Stop Program"
            @click="stopSimulation">
            <template #icon><n-icon>
                <IconPlayerStop />
              </n-icon></template>
          </n-button>
          <n-button quaternary circle size="tiny" :disabled="!canRestart" title="Restart Program (F9)"
            @click="handleRestart">
            <template #icon><n-icon>
                <IconRestore />
              </n-icon></template>
          </n-button>
          <n-button quaternary circle size="tiny" type="primary" :disabled="isRunning" title="Step (F10)"
            @click="handleStep">
            <template #icon><n-icon>
                <IconPlayerSkipForward />
              </n-icon></template>
          </n-button>
          <n-divider vertical />
          <n-text depth="2" class="text-xs font-medium tabular-nums">
            Cycle {{ simulationStore.cycleCount }}
            <template v-if="simulationStore.haltedAtCycle !== null">
              · finished @ {{ simulationStore.haltedAtCycle }}
            </template>
          </n-text>
        </n-space>



        <!-- Architecture Settings -->
        <template v-if="hasProject && isWorkspace">
          <n-divider vertical />
          <n-button quaternary size="tiny" @click="uiStore.openArchitectureSettings" title="Architecture Settings">
            <template #icon><n-icon>
                <IconSettings2 />
              </n-icon></template>
          </n-button>
          <n-divider vertical />
        </template>

        <!-- Workspace Specific Perspective Switch -->
        <n-button-group size="tiny" v-if="hasProject && isWorkspace">
          <n-button :secondary="uiStore.perspective !== 'design'"
            :type="uiStore.perspective === 'design' ? 'primary' : 'default'"
            @click="uiStore.perspective = 'design'">Design</n-button>
          <n-button :secondary="uiStore.perspective !== 'simulate'"
            :type="uiStore.perspective === 'simulate' ? 'primary' : 'default'"
            @click="uiStore.perspective = 'simulate'">Simulate</n-button>
        </n-button-group>

        <n-divider vertical v-if="hasProject && isWorkspace" />



        <!-- Global Project Actions -->
        <n-button quaternary size="tiny" @click="handleSave" v-if="hasProject && isWorkspace" title="Save Project">
          <template #icon><n-icon>
              <IconDeviceFloppy />
            </n-icon></template>
        </n-button>



        <n-divider vertical />

        <!-- Global Theme Toggle -->
        <n-button quaternary size="tiny" @click="toggleTheme" class="px-1">
          <n-icon size="16">
            <IconSun v-if="isDark" />
            <IconMoon v-else />
          </n-icon>
        </n-button>
      </div>
    </div>
  </n-layout-header>
</template>

<style scoped>
.n-layout-header {
  background-color: var(--bg-surface);
}

:deep(.n-button),
:deep(.n-button-group .n-button) {
  border-radius: 0;
}
</style>
