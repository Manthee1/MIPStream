<script setup lang="ts">
import GoldenLayout from '../../components/layout/GoldenLayout.vue';
import ModulePalette from '../components/ModulePalette.vue';
import SchematicEditor from '../components/SchematicEditor.vue';
import InspectorPanel from '../components/InspectorPanel.vue';
import ProblemsPanel from '../components/ProblemsPanel.vue';
import { LayoutConfig } from 'golden-layout';
import { useProjectStore } from '../../stores/projectStore';
import { reconcileLayoutConfig } from '../../shared/utils/layout-reconcile';
import { useLayoutPersistence } from '../../composables/useLayoutPersistence';

const projectStore = useProjectStore();

const defaultConfig: LayoutConfig = {
  root: {
    type: 'row',
    content: [
      {
        type: 'component',
        componentType: 'Palette',
        width: 20,
        title: 'Hardware Modules'
      },
      {
        type: 'column',
        width: 60,
        content: [
          {
            type: 'component',
            componentType: 'Editor',
            height: 72,
            title: 'Schematic'
          },
          {
            type: 'component',
            componentType: 'Problems',
            height: 28,
            title: 'Problems'
          }
        ]
      },
      {
        type: 'component',
        componentType: 'Inspector',
        width: 20,
        title: 'Properties'
      }
    ]
  }
};

const components = {
  Palette: ModulePalette,
  Editor: SchematicEditor,
  Problems: ProblemsPanel,
  Inspector: InspectorPanel
};

// Restore the project's saved Design arrangement when one exists, reconciled
// against the fixed component registry above (stale panels drop, missing
// panels append). Falls back to the default arrangement otherwise.
const { handleLayoutChange } = useLayoutPersistence();

const savedLayout = projectStore.currentProject?.layouts?.design;
const config: LayoutConfig = savedLayout
  ? reconcileLayoutConfig(savedLayout as unknown as LayoutConfig, defaultConfig, Object.keys(components))
  : defaultConfig;
</script>

<template>
  <div class="w-full h-full">
    <GoldenLayout :config="config" :components="components" layout-id="design"
      @layout-change="(c) => handleLayoutChange('design', c)" />
  </div>
</template>
