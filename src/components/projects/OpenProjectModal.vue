<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NModal, NCard, NList, NListItem, NText, NButton, NSpace, useMessage, NIcon, NThing } from 'naive-ui';
import { getProjects } from '../../services/projectsService';
import { Project } from '../../shared/types/project';
import { useProjectStore } from '../../stores/projectStore';
import { useRouter } from 'vue-router';
import { IconFolder, IconClock } from '@tabler/icons-vue';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits(['update:show']);

const projectStore = useProjectStore();
const router = useRouter();
const message = useMessage();

const projects = ref<Project[]>([]);
const loading = ref(false);

const loadProjects = async () => {
  loading.value = true;
  try {
    projects.value = await getProjects(50, { by: 'updatedAt', type: 'desc' });
  } catch (error: any) {
    message.error('Failed to load projects: ' + error.message);
  } finally {
    loading.value = false;
  }
};

const handleOpen = (project: Project) => {
  projectStore.setCurrentProject(project);
  message.success(`Loaded project: ${project.name}`);
  emit('update:show', false);
  router.push('/workspace');
};

const handleCancel = () => {
  emit('update:show', false);
};

onMounted(() => {
  if (props.show) {
    loadProjects();
  }
});

// Watch for show prop to refresh list
import { watch } from 'vue';
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadProjects();
  }
});
</script>

<template>
  <n-modal :show="show" @update:show="val => emit('update:show', val)" transform-origin="center">
    <n-card style="width: 600px" title="Open Project" :bordered="false" size="huge" role="dialog" aria-modal="true">
      <div class="max-h-96 overflow-y-auto pr-2">
        <n-list hoverable clickable>
          <n-list-item v-for="project in projects" :key="project.id" @click="handleOpen(project)">
            <template #prefix>
              <n-icon size="24" class="text-slate-400">
                <IconFolder />
              </n-icon>
            </template>

            <n-space justify="space-between" align="center">
              <n-space vertical :size="2" class="flex-1">
                <n-text strong>{{ project.name }}</n-text>
                <n-text depth="3" class="text-xs">{{ project.description || 'No description' }}</n-text>
              </n-space>
              <n-space align="center" :size="4">
                <n-icon size="14" depth="3">
                  <IconClock />
                </n-icon>
                <n-text depth="3" class="text-xs">
                  {{ new Date(project.updatedAt).toLocaleDateString() }}
                </n-text>
              </n-space>
            </n-space>
          </n-list-item>
        </n-list>

        <div v-if="projects.length === 0 && !loading" class="py-12 text-center">
          <n-text depth="3">No projects found.</n-text>
        </div>
      </div>

      <template #footer>
        <n-space justify="end">
          <n-button @click="handleCancel">Cancel</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>
