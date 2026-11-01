<script setup lang="ts">
import { onMounted } from 'vue';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/UIStore';
import { IconPlus, IconFolderOpen } from '@tabler/icons-vue';
import { NLayout, NLayoutContent, NSpace, NH1, NH2 } from 'naive-ui';
import StartActionButton from '../components/projects/StartActionButton.vue';
import ResumeBanner from '../components/projects/ResumeBanner.vue';
import RecentProjectsTable from '../components/projects/RecentProjectsTable.vue';

const projectStore = useProjectStore();
const uiStore = useUIStore();

const createNewProject = () => {
  uiStore.showCreateProjectModal = true;
};

const handleFileOpen = () => {
  uiStore.showOpenProjectModal = true;
};

onMounted(() => {
  projectStore.updateRecentProjects();
});
</script>

<template>
  <n-layout class="min-h-full bg-surface-0">
    <n-layout-content content-style="padding: 48px 24px;">
      <div class="max-w-4xl mx-auto">
        <header class="flex items-center justify-between mb-12">
          <n-h1 class="m-0 text-3xl font-bold tracking-tight">MIPStream</n-h1>
        </header>

        <main class="grid gap-8">
          <ResumeBanner />

          <section>
            <n-h2 class="text-xl font-semibold mb-4">Start</n-h2>
            <n-space vertical :size="16">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StartActionButton :icon="IconPlus" title="New Project"
                  description="Create a new project from a template"
                  icon-container-class="bg-accent/10 text-accent justify-start" @click="createNewProject" />

                <StartActionButton :icon="IconFolderOpen" title="Open Project"
                  description="Load an existing .mipstream file" @click="handleFileOpen" />
              </div>
            </n-space>
          </section>

          <section>
            <n-h2 class="text-xl font-semibold mb-4">Recent Projects</n-h2>
            <RecentProjectsTable />
          </section>
        </main>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<style scoped>
:deep(.n-h1),
:deep(.n-h2) {
  margin-top: 0;
}
</style>
