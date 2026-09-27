<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useProjectStore } from '../stores/projectStore';
import { useRouter } from 'vue-router';
import { IconPlus, IconFolderOpen } from '@tabler/icons-vue';
import { NLayout, NLayoutContent, NSpace, NCard, NText, NH1, NH2, NIcon, useMessage } from 'naive-ui';
import CreateProjectModal from '../components/projects/CreateProjectModal.vue';
import { Project } from '../shared/types/project';

const projectStore = useProjectStore();
const router = useRouter();
const message = useMessage();

const showCreateModal = ref(false);

const createNewProject = () => {
  showCreateModal.value = true;
};

const openProject = (project: Project) => {
  projectStore.setCurrentProject(project);
  message.success(`Loaded project: ${project.name}`);
  router.push('/workspace');
};

const handleFileOpen = () => {
  message.info('Open from file system coming soon. Use the list below for now.');
};

onMounted(() => {
  projectStore.updateRecentProjects();
});
</script>

<template>
  <n-layout class="min-h-screen bg-surface-0">
    <n-layout-content content-style="padding: 48px 24px;">
      <div class="max-w-4xl mx-auto">
        <header class="flex items-center justify-between mb-12">
          <n-h1 class="m-0 text-3xl font-bold tracking-tight">MIPStream</n-h1>
        </header>

        <main class="grid gap-8">
          <section>
            <n-h2 class="text-xl font-semibold mb-4">Start</n-h2>
            <n-space vertical :size="16">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <n-card hoverable @click="createNewProject"
                  class="cursor-pointer border-slate-200 dark:border-slate-800 rounded-none">
                  <n-space align="center" :size="16">
                    <div class="p-3 bg-accent/10 text-accent flex items-center justify-center">
                      <n-icon size="24">
                        <IconPlus />
                      </n-icon>
                    </div>
                    <div>
                      <n-text strong class="text-lg">New Project</n-text>
                      <br />
                      <n-text depth="3">Create a new project from a template</n-text>
                    </div>
                  </n-space>
                </n-card>

                <n-card hoverable @click="handleFileOpen"
                  class="cursor-pointer border-slate-200 dark:border-slate-800 rounded-none">
                  <n-space align="center" :size="16">
                    <div
                      class="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                      <n-icon size="24">
                        <IconFolderOpen />
                      </n-icon>
                    </div>
                    <div>
                      <n-text strong class="text-lg">Open Project</n-text>
                      <br />
                      <n-text depth="3">Load an existing .mipstream file</n-text>
                    </div>
                  </n-space>
                </n-card>
              </div>
            </n-space>
          </section>

          <section>
            <n-h2 class="text-xl font-semibold mb-4">Recent Projects</n-h2>

            <n-card v-if="projectStore.recentProjects.length > 0" class="border-slate-200 dark:border-slate-800"
              content-style="padding: 0;">
              <div v-for="project in projectStore.recentProjects" :key="project.id"
                @click="openProject(project)"
                class="p-4 flex items-center justify-between border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <div>
                  <n-text strong>{{ project.name }}</n-text>
                  <div v-if="project.description" class="text-xs text-slate-500 mt-1">{{ project.description }}</div>
                </div>
                <n-text depth="3" class="text-xs">Last updated: {{ new Date(project.updatedAt).toLocaleDateString()
                }}</n-text>
              </div>
            </n-card>
            <n-card v-else class="border-slate-200 dark:border-slate-800">
              <n-text depth="3">No recent projects found. Start by creating a new project.</n-text>
            </n-card>
          </section>
        </main>
      </div>

      <CreateProjectModal v-model:show="showCreateModal" />
    </n-layout-content>
  </n-layout>
</template>

<style scoped>
:deep(.n-h1),
:deep(.n-h2) {
  margin-top: 0;
}
</style>
