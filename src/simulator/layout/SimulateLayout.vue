<script setup lang="ts">
import { defineComponent, h, markRaw, type Component } from 'vue';
import { NEmpty } from 'naive-ui';
import GoldenLayout from '../../components/layout/GoldenLayout.vue';
import CodeEditor from '../components/CodeEditor.vue';
import ModulePanelHost from '../components/ModulePanelHost.vue';
import SchematicViewer from '../../editor/components/SchematicViewer.vue';
import { LayoutConfig, type ComponentItemConfig } from 'golden-layout';
import { useProjectStore } from '../../stores/projectStore';
import { getManifest } from '../../shared/manifestRegistry';

/**
 * Simulate perspective layout (Phase 4). Panel discovery is data-driven:
 * every architecture module whose manifest ships a simulator panel
 * (`ModuleManifest.panel`) is mounted through the generic `ModulePanelHost`,
 * and one editor tab is created per assembler-mapping editor id — so any
 * architecture (not just the MIPS template) gets its panels for free.
 *
 * The layout is a static-at-mount snapshot: SimulateLayout remounts on every
 * perspective switch (`Workspace.vue`), which is exactly when the
 * architecture could have changed.
 */

const projectStore = useProjectStore();
const architecture = projectStore.currentProject?.architecture;
const editors = projectStore.currentProject?.software?.editors ?? [];

/** Wrapper factory — Golden Layout instantiates components with no props. */
function bindProps<T extends Record<string, unknown>>(
  name: string,
  component: Component,
  props: T,
): Component {
  return markRaw(defineComponent({
    name,
    render: () => h(component, props),
  }));
}



// -------------------------------------------------------- panel tab set

const components: Record<string, Component> = { Viewer: SchematicViewer };

const panelTabs: ComponentItemConfig[] = (
  architecture?.modules ?? []
)
  .map((module) => ({ module, manifest: getManifest(module.typeId) }))
  .filter((entry) => entry.manifest?.panel)
  .map(({ module, manifest }) => {
    const componentType = `Panel-${module.designator}`;
    components[componentType] = bindProps(
      `PanelHost-${module.designator}`,
      ModulePanelHost,
      { designator: module.designator },
    );
    // Disambiguate titles when several panel-capable modules share a label.
    const label = manifest!.label;
    const duplicates = (architecture?.modules ?? []).filter(
      (candidate) => getManifest(candidate.typeId)?.label === label,
    ).length > 1;
    return {
      type: 'component' as const,
      componentType,
      title: duplicates ? `${label} (${module.designator})` : label,
    };
  });



// -------------------------------------------------------- editor tab set

const mappings = architecture?.configuration?.assembler?.mappings ?? [];
const mappedEditorIds = [...new Set(mappings.map((mapping) => mapping.editorId))];
const editorIds = mappedEditorIds.length > 0 ? mappedEditorIds : editors.map((entry) => entry.id);

const editorTabs: ComponentItemConfig[] = editorIds.map((editorId) => {
  const componentType = `Code-${editorId}`;
  components[componentType] = bindProps(`CodeEditor-${editorId}`, CodeEditor, { editorId });
  const name = editors.find((entry) => entry.id === editorId)?.name ?? editorId;
  return { type: 'component' as const, componentType, title: name };
});

// ----------------------------------------------------------- root config

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
            height: 70,
          },
          {
            type: 'stack',
            height: 30,
            content: panelTabs,
          },
        ],
      },
      ...(editorTabs.length === 1
        ? [{ ...editorTabs[0], width: 30 }]
        : editorTabs.length > 1
          ? [{ type: 'stack' as const, width: 30, content: editorTabs }]
          : []),
    ],
  },
};
</script>

<template>
  <div class="w-full h-full">
    <GoldenLayout :config="config" :components="components" />
  </div>
</template>
