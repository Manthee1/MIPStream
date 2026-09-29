<script setup lang="ts">
import GoldenLayout from '../../components/layout/GoldenLayout.vue';
import CodeEditor from '../components/CodeEditor.vue';
import RegistersPanel from '../components/RegistersPanel.vue';
import SchematicEditor from '../../editor/components/SchematicEditor.vue';
import { LayoutConfig } from 'golden-layout';

const config: LayoutConfig = {
  root: {
    type: 'row',
    content: [
      {
        type: 'column',
        width: 70,
        content: [
          {
            type: 'component',
            componentType: 'Viewer',
            title: 'Architecture View',
            height: 70
          },
          {
            type: 'stack',
            height: 30,
            content: [
              {
                type: 'component',
                componentType: 'Registers',
                title: 'Registers'
              },
              {
                type: 'component',
                componentType: 'Memory',
                title: 'Memory'
              }
            ]
          }
        ]
      },
      {
        type: 'component',
        componentType: 'Code',
        width: 30,
        title: 'Assembly Editor'
      }
    ]
  }
};

const components = {
  Viewer: SchematicEditor, // Reuse editor for now, will lock it later
  Code: CodeEditor,
  Registers: RegistersPanel,
  Memory: { template: '<div class="p-4 text-secondary opacity-50">Memory Panel Placeholder</div>' }
};
</script>

<template>
  <div class="w-full h-full">
    <GoldenLayout :config="config" :components="components" />
  </div>
</template>
