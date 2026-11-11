<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NModal, NCard, NForm, NFormItem, NInput, NButton, NSpace, NText, useMessage } from 'naive-ui';
import { useUIStore } from '../../stores/UIStore';
import { useProjectStore } from '../../stores/projectStore';
import { useArchitectureTransfer } from '../../composables/useArchitectureTransfer';

const uiStore = useUIStore();
const projectStore = useProjectStore();
const message = useMessage();
const { saveAsTemplate } = useArchitectureTransfer();

const show = computed({
  get: () => uiStore.showSaveTemplateModal,
  set: (value: boolean) => { uiStore.showSaveTemplateModal = value; },
});

const model = ref({ name: '', description: '' });
const saving = ref(false);

// A fresh draft every time the modal opens — defaults to the architecture's name.
watch(show, (open) => {
  if (open) {
    model.value = {
      name: projectStore.currentProject?.architecture?.name || '',
      description: '',
    };
  }
});

const handleSave = async () => {
  const name = model.value.name.trim();
  if (!name) {
    message.error('Template name is required.');
    return;
  }
  saving.value = true;
  try {
    if (await saveAsTemplate(name, model.value.description.trim())) {
      show.value = false;
    }
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <n-modal v-model:show="show" transform-origin="center">
    <n-card style="width: 520px" title="Save Architecture as Template" :bordered="false" size="huge" role="dialog"
      aria-modal="true" closable @close="show = false">
      <n-form label-placement="top" :show-feedback="false" class="flex flex-col gap-4">
        <n-text depth="3" class="text-xs">
          Stores the current architecture — modules, wiring, pipeline, assembler and ISA configuration —
          as a reusable template in the Create Project picker. Templates carry hardware only; code editors
          are not included.
        </n-text>
        <n-form-item label="Template Name">
          <n-input v-model:value="model.name" placeholder="Enter template name" />
        </n-form-item>
        <n-form-item label="Description">
          <n-input v-model:value="model.description" type="textarea"
            placeholder="Enter template description (optional)" />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="show = false">Cancel</n-button>
          <n-button type="primary" :loading="saving" @click="handleSave">Save Template</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>
