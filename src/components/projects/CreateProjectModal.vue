<script setup lang="ts">
import { ref, computed } from 'vue';
import { NModal, NCard, NForm, NFormItem, NInput, NButton, NSpace, NText, useMessage, NIcon, NRadioGroup, NRadioButton, NGrid, NGi } from 'naive-ui';
import { PROJECT_TEMPLATES } from '../../config/templates';
import { insertProject } from '../../services/projectsService';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../../stores/projectStore';
import * as TablerIcons from '@tabler/icons-vue';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits(['update:show', 'created']);

const router = useRouter();
const message = useMessage();
const projectStore = useProjectStore();

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

const selectedTemplate = computed(() =>
  PROJECT_TEMPLATES.find(t => t.id === model.value.templateId)
);

const handleCancel = () => {
  emit('update:show', false);
};

const handleCreate = async () => {
  formRef.value?.validate(async (errors: any) => {
    if (!errors) {
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
        router.push('/workspace');
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
        </n-radio-group>
        <!-- Template description -->
        <template v-if="selectedTemplate">
          <n-text depth="3" class="mb-2 block font-semibold">Template Info:</n-text>
          <n-card>
            <n-space align="center" :size="18">
              <n-icon size="20">
                <component :is="getIcon(selectedTemplate.icon)" />
              </n-icon>
              <n-space vertical :size="2">
                <n-text strong class="text-sm">{{ selectedTemplate.name }}</n-text>
                <n-text depth="3" class="text-sm line-clamp-2">{{ selectedTemplate.description }}</n-text>
              </n-space>
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
