<script setup lang="ts">
import GoldenLayout from '../../components/layout/GoldenLayout.vue';
import ModulePalette from '../components/ModulePalette.vue';
import SchematicEditor from '../components/SchematicEditor.vue';
import InspectorPanel from '../components/InspectorPanel.vue';
import ProblemsPanel from '../components/ProblemsPanel.vue';
import { LayoutConfig } from 'golden-layout';

const config: LayoutConfig = {
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
</script>

<template>
  <div class="w-full h-full">
    <GoldenLayout :config="config" :components="components" />
  </div>
</template>
