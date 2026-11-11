<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { NModal, NCard, NForm, NFormItem, NInput, NButton, NSpace, NText, useMessage, NIcon, NRadioGroup, NRadioButton, NGrid, NGi, NPopconfirm } from 'naive-ui';
import { PROJECT_TEMPLATES } from '../../config/templates';
import { insertProject } from '../../services/projectsService';
import { deleteArchitectureTemplate, getArchitectureTemplates } from '../../services/architectureTemplatesService';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../../stores/projectStore';
import { useProjectSwitch } from '../../composables/useProjectSwitch';
import * as TablerIcons from '@tabler/icons-vue';
import { IconTrash } from '@tabler/icons-vue';
import type { ArchitectureConfig } from '../../shared/types/architecture';
import type { ProjectEditor } from '../../shared/types/project';
import type { ArchitectureTemplate } from '../../shared/types/architecture-template';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits(['update:show', 'created']);

const router = useRouter();
const message = useMessage();
const projectStore = useProjectStore();
const { ensureSafeToSwitch } = useProjectSwitch();

const formRef = ref<any>(null);
const loading = ref(false);

const model = ref({
  name: '',
  description: '',
  templateId: 'blank'
});

const rules = {
  name: {
    required: true,
    message: 'Please input project name',
    trigger: 'blur'
  }
};

/** Selection value prefix for user-made templates (built-ins use their raw id). */
const USER_TEMPLATE_PREFIX = 'user:';

/** Uniform pick over built-in and user templates (drives create + info card). */
interface TemplateSelection {
  name: string;
  description: string;
  icon: string;
  architecture: ArchitectureConfig;
  initialSoftware?: ProjectEditor[];
  /** The underlying user-template row — present only on "My Templates" picks. */
  userTemplate?: ArchitectureTemplate;
}

/** User-made architecture templates ("save as template"), oldest first. */
const userTemplates = ref<ArchitectureTemplate[]>([]);

const refreshUserTemplates = async () => {
  try {
    userTemplates.value = await getArchitectureTemplates();
  } catch (error: any) {
    message.error('Failed to load templates: ' + error.message);
  }
};

// Refresh whenever the modal opens so freshly saved templates appear.
watch(() => props.show, (open) => { if (open) void refreshUserTemplates(); });

const selectedTemplate = computed<TemplateSelection | null>(() => {
  const id = model.value.templateId;
  if (id.startsWith(USER_TEMPLATE_PREFIX)) {
    const template = userTemplates.value.find(t => USER_TEMPLATE_PREFIX + t.id === id);
    return template
      ? {
          name: template.name,
          description: template.description,
          icon: template.icon,
          architecture: template.architecture,
          userTemplate: template,
        }
      : null;
  }
  return PROJECT_TEMPLATES.find(t => t.id === id) ?? null;
});

/** Deletes the selected user template and falls back to the Blank pick. */
const handleDeleteSelectedTemplate = async () => {
  const target = selectedTemplate.value?.userTemplate;
  if (!target) return;
  await deleteArchitectureTemplate(target.id);
  await refreshUserTemplates();
  if (model.value.templateId === USER_TEMPLATE_PREFIX + target.id) {
    model.value.templateId = 'blank';
  }
  message.success(`Template "${target.name}" deleted.`);
};

/** The user-template row behind the current pick (drives the delete affordance). */
const selectedUserTemplate = computed(() => selectedTemplate.value?.userTemplate ?? null);

const handleCancel = () => {
  emit('update:show', false);
};

const handleCreate = async () => {
  formRef.value?.validate(async (errors: any) => {
    if (!errors) {
      // Replacing the active project discards its unsaved state — guard first.
      if (!(await ensureSafeToSwitch())) return;
      loading.value = true;
      try {
        const template = selectedTemplate.value;
        if (!template) throw new Error('Invalid template');

        const newProject = await insertProject({
          name: model.value.name,
          description: model.value.description,
          architecture: JSON.parse(JSON.stringify(template.architecture)),
          software: {
            editors: template.initialSoftware ? JSON.parse(JSON.stringify(template.initialSoftware)) : []
          }
        });

        message.success('Project created successfully');
        projectStore.setCurrentProject(newProject);
        emit('update:show', false);
        emit('created', newProject);
        // Session URL form so F5/deep-links restore this project immediately.
        router.push({ path: `/workspace/${newProject.id}` });
      } catch (error: any) {
        message.error('Failed to create project: ' + error.message);
      } finally {
        loading.value = false;
      }
    }
  });
};

const getIcon = (iconName: string) => {
  return (TablerIcons as any)[iconName] || TablerIcons.IconCpu;
};
</script>

<template>
  <n-modal :show="show" @update:show="val => emit('update:show', val)" transform-origin="center">
    <n-card style="width: 650px" title="Create New Project" :bordered="false" size="huge" role="dialog"
      aria-modal="true">
      <n-form ref="formRef" :model="model" :rules="rules">
        <n-form-item label="Project Name" path="name">
          <n-input v-model:value="model.name" placeholder="Enter project name" />
        </n-form-item>

        <n-form-item label="Description" path="description">
          <n-input v-model:value="model.description" type="textarea"
            placeholder="Enter project description (optional)" />
        </n-form-item>

        <n-text depth="3" class="mb-2 block font-semibold">Select Template</n-text>
        <n-radio-group v-model:value="model.templateId" class="mb-6">
          <n-grid :cols="2" :x-gap="12" :y-gap="12">
            <n-gi v-for="template in PROJECT_TEMPLATES" :key="template.id">
              <n-radio-button :value="template.id" class="w-full">
                <n-space class="w-full h-30" justify="center" vertical align="center" size="small">
                  <n-icon size="32">
                    <component :is="getIcon(template.icon)" />
                  </n-icon>
                  <span>{{ template.name }}</span>
                </n-space>
              </n-radio-button>
            </n-gi>
          </n-grid>

          <!-- User-made templates ("save as template") — hardware only, no code. -->
          <n-text depth="3" class="mb-2 mt-4 block font-semibold">My Templates</n-text>
          <n-grid v-if="userTemplates.length > 0" :cols="2" :x-gap="12" :y-gap="12">
            <n-gi v-for="template in userTemplates" :key="template.id">
              <n-radio-button :value="`user:${template.id}`" class="w-full">
                <n-space class="w-full h-30" justify="center" vertical align="center" size="small">
                  <n-icon size="32">
                    <component :is="getIcon(template.icon)" />
                  </n-icon>
                  <span>{{ template.name }}</span>
                </n-space>
              </n-radio-button>
            </n-gi>
          </n-grid>
          <n-text v-else depth="3" class="text-xs block">
            No saved templates yet — use File ▸ "Save Architecture as Template…" to store the
            architecture of any project for reuse here.
          </n-text>
        </n-radio-group>
        <!-- Template description -->
        <template v-if="selectedTemplate">
          <n-text depth="3" class="mb-2 block font-semibold">Template Info:</n-text>
          <n-card>
            <n-space align="center" :size="18" class="w-full justify-between">
              <n-space align="center" :size="18" class="min-w-0">
                <n-icon size="20">
                  <component :is="getIcon(selectedTemplate.icon)" />
                </n-icon>
                <n-space vertical :size="2" class="min-w-0">
                  <n-text strong class="text-sm">{{ selectedTemplate.name }}</n-text>
                  <n-text depth="3" class="text-sm line-clamp-2">{{ selectedTemplate.description }}</n-text>
                </n-space>
              </n-space>
              <!-- Only user templates are deletable; built-ins ship with the app. -->
              <n-popconfirm v-if="selectedUserTemplate" @positive-click="handleDeleteSelectedTemplate">
                <template #trigger>
                  <n-button size="tiny" quaternary type="error" title="Delete template">
                    <template #icon>
                      <n-icon><IconTrash /></n-icon>
                    </template>
                  </n-button>
                </template>
                Delete template "{{ selectedUserTemplate.name }}"?
                Projects already created from it are not affected.
              </n-popconfirm>
            </n-space>
          </n-card>
        </template>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="handleCancel">Cancel</n-button>
          <n-button type="primary" :loading="loading" @click="handleCreate">
            Create Project
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
