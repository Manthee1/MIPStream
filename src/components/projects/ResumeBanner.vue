<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NCard, NIcon, NText } from 'naive-ui';
import { IconRestore, IconArrowRight } from '@tabler/icons-vue';
import { getProject } from '../../services/projectsService';
import type { Project } from '../../shared/types/project';
import { getLastSession, clearLastSession } from '../../storage/session-storage';
import { useProjectSwitch } from '../../composables/useProjectSwitch';

/**
 * Home-page "Resume where you left off" banner. Shown when localStorage holds
 * a last-session pointer whose project still exists; opening routes through
 * the guarded `openProject` funnel and restores the recorded perspective.
 * Covers the exit-to-Home path and the auto-reopen setting being disabled.
 */
const { openProject } = useProjectSwitch();

const resumeProject = ref<Project | null>(null);
const resumePerspective = ref<'design' | 'simulate'>('design');

const formattedDate = ref('');

onMounted(async () => {
  const last = getLastSession();
  if (!last) return;
  try {
    const project = await getProject(last.projectId);
    if (!project) {
      // Project deleted since — drop the stale pointer.
      clearLastSession();
      return;
    }
    resumeProject.value = project;
    resumePerspective.value = last.perspective;
    formattedDate.value = new Date(project.updatedAt).toLocaleString();
  } catch (error) {
    console.warn('Failed to resolve last session:', error);
  }
});

const resume = () => {
  const project = resumeProject.value;
  if (!project) return;
  void openProject(project, { perspective: resumePerspective.value });
};
</script>

<template>
  <n-card v-if="resumeProject" content-style="padding: 14px 16px">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 min-w-0">
        <n-icon size="26" class="text-accent shrink-0">
          <IconRestore />
        </n-icon>
        <div class="min-w-0">
          <n-text strong class="block truncate">Resume “{{ resumeProject.name }}”</n-text>
          <n-text depth="3" class="text-xs">
            {{ resumePerspective === 'design' ? 'Design' : 'Simulate' }} perspective · updated {{ formattedDate }}
          </n-text>
        </div>
      </div>
      <n-button type="primary" size="small" class="shrink-0" @click="resume">
        <template #icon>
          <n-icon>
            <IconArrowRight />
          </n-icon>
        </template>
        Open
      </n-button>
    </div>
  </n-card>
</template>