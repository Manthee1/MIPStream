<script setup lang="ts">
import { useProjectStore } from '../stores/projectStore';
import { useRouter } from 'vue-router';
import { Plus, FolderOpen, Cpu } from 'lucide-vue-next';

const projectStore = useProjectStore();
const router = useRouter();

const createNewProject = () => {
  // Logic to create a new project
  router.push('/workspace');
};
</script>

<template>
  <div class="max-w-4xl mx-auto py-12 px-6">
    <header class="flex items-center justify-between mb-12">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-accent rounded-lg text-white">
          <Cpu :size="32" />
        </div>
        <h1 class="text-3xl font-bold tracking-tight">MIPStream</h1>
      </div>
    </header>

    <main class="grid gap-8">
      <section>
        <h2 class="text-xl font-semibold mb-4">Start</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            @click="createNewProject"
            class="flex items-center gap-4 p-6 bg-white dark:bg-surface-1 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-accent transition-colors text-left"
          >
            <div class="p-3 bg-accent/10 text-accent rounded-full">
              <Plus :size="24" />
            </div>
            <div>
              <div class="font-bold">New Architecture</div>
              <div class="text-sm text-slate-500">Create a new CPU design from scratch</div>
            </div>
          </button>

          <button 
            class="flex items-center gap-4 p-6 bg-white dark:bg-surface-1 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-accent transition-colors text-left"
          >
            <div class="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
              <FolderOpen :size="24" />
            </div>
            <div>
              <div class="font-bold">Open Project</div>
              <div class="text-sm text-slate-500">Load an existing .simproj file</div>
            </div>
          </button>
        </div>
      </section>

      <section v-if="projectStore.recentProjects.length > 0">
        <h2 class="text-xl font-semibold mb-4">Recent Projects</h2>
        <div class="bg-white dark:bg-surface-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div 
            v-for="project in projectStore.recentProjects" 
            :key="project.id"
            class="p-4 flex items-center justify-between border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
          >
            <span class="font-medium">{{ project.name }}</span>
            <span class="text-xs text-slate-400">Last updated: {{ new Date(project.updatedAt).toLocaleDateString() }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
