<script setup lang="ts">
/** @format */

import { computed, reactive, watch } from 'vue';
import { NEmpty, NInput, NRadio, NRadioGroup, NScrollbar, NTag, NText } from 'naive-ui';
import { selectedIds, documentRevision } from '../core/selection-bridge';
import { getActiveDesigner } from '../core/designer-bridge';
import type { HydratedModule, PortDefinition } from '@/shared/types/manifest';
import type { NetStyle } from '@/shared/types/netlist';
import ConfigForm from './config/ConfigForm.vue';

/**
 * Live view of the single selected module. The document-revision dependency
 * re-reads the designer's module data after every committed change (config
 * edits rebuild the hydrated module in place).
 */
const selected = computed<HydratedModule | null>(() => {
  void documentRevision.value;
  if (selectedIds.value.length !== 1) return null;
  return getActiveDesigner()?.getModule(selectedIds.value[0]) ?? null;
});

/** Labels of every selected item; ids without a module fall back to the id. */
const selectedLabels = computed<string[]>(() => {
  void documentRevision.value;
  const designer = getActiveDesigner();
  return selectedIds.value.map((id) => designer?.getModule(id)?.manifest.label ?? id);
});

const sortedPorts = computed<PortDefinition[]>(() => {
  const ports = selected.value?.ports ?? [];
  return [...ports].sort(
    (a, b) => a.direction.localeCompare(b.direction) || a.id.localeCompare(b.id)
  );
});

/** Effective label of a port: the per-instance override or the manifest default. */
function portLabel(module: HydratedModule, port: PortDefinition): string {
  const overrides = module.config?.portLabels as Record<string, string> | undefined;
  return overrides?.[port.id] ?? port.label;
}

/** Uncommitted port-label drafts (committed on blur/Enter). */
const labelDrafts = reactive<Record<string, string>>({});

// Stale drafts must never leak into a different module's commit.
watch(
  () => selected.value?.designator,
  () => {
    for (const key of Object.keys(labelDrafts)) delete labelDrafts[key];
  }
);

/** Ids of the selected nets (selection ids without a module node are nets). */
const selectedNetIds = computed<string[]>(() => {
  void documentRevision.value;
  const designer = getActiveDesigner();
  if (selectedIds.value.length === 0) return [];
  return selectedIds.value.filter((id) => !!designer?.getWireNode(id));
});

/** Uniform style across the selected nets, or null when they are mixed. */
const netStyle = computed<NetStyle | null>(() => {
  void documentRevision.value;
  const designer = getActiveDesigner();
  if (!designer || selectedNetIds.value.length === 0) return null;
  const styles = selectedNetIds.value.map((id) => designer.getNetStyle(id) ?? 'solid');
  return styles.every((style) => style === styles[0]) ? styles[0] : null;
});

/** Applies one wire style to every selected net (multi-select included). */
function applyNetStyle(style: NetStyle): void {
  getActiveDesigner()?.setNetStyle(selectedNetIds.value, style);
}

function commitPortLabel(port: PortDefinition): void {
  const module = selected.value;
  if (!module) return;
  const draft = labelDrafts[port.id];
  if (draft === undefined) return;
  delete labelDrafts[port.id];
  if (draft === portLabel(module, port)) return;

  const overrides = {
    ...((module.config?.portLabels as Record<string, string> | undefined) ?? {}),
  };
  if (draft === port.label) delete overrides[port.id];
  else overrides[port.id] = draft;
  applyConfig('portLabels', overrides);
}

/** Applies one config key of the selected module through the designer. */
function applyConfig(key: string, value: unknown): void {
  const module = selected.value;
  if (!module) return;
  getActiveDesigner()?.setModuleConfig(module.designator, {
    ...module.config,
    [key]: value,
  });
}

/** Applies a whole replacement config (custom config editors). */
function applyFullConfig(config: unknown): void {
  const module = selected.value;
  if (!module) return;
  getActiveDesigner()?.setModuleConfig(
    module.designator,
    JSON.parse(JSON.stringify(config)) as Record<string, unknown>
  );
}
</script>

<template>
  <div class="h-full flex flex-col bg-surface">
    <div class="p-4 border-b border-white/10 dark:border-white/5">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Inspector</n-text>
    </div>

    <n-scrollbar class="flex-1">
      <!-- No selection -->
      <div v-if="selectedIds.length === 0" class="h-full flex items-center justify-center p-8">
        <n-empty description="Select a component to view properties" />
      </div>

      <!-- Multi-selection: configuration requires exactly one module -->
      <div v-else-if="!selected" class="p-4 flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <n-text class="text-sm">{{ selectedIds.length }} element{{ selectedIds.length === 1 ? '' : 's' }} selected</n-text>
          <n-text depth="3" class="text-xs">{{ selectedLabels.join(', ') }}</n-text>
        </div>

        <!-- Wire style applies to every selected net, multi-select included -->
        <div v-if="selectedNetIds.length > 0" class="flex flex-col gap-2">
          <n-text strong class="text-xs uppercase tracking-widest opacity-50">Wire style</n-text>
          <n-radio-group
            size="small"
            :value="netStyle ?? undefined"
            @update:value="applyNetStyle($event as NetStyle)"
          >
            <div class="flex gap-3">
              <n-radio value="solid">Solid</n-radio>
              <n-radio value="dashed">Dashed</n-radio>
              <n-radio value="dotted">Dotted</n-radio>
            </div>
          </n-radio-group>
          <n-text v-if="!netStyle" depth="3" class="text-xs">
            Mixed styles — picking one applies it to all selected nets.
          </n-text>
          <n-text v-else-if="selectedIds.length !== selectedNetIds.length" depth="3" class="text-xs">
            Applies to the {{ selectedNetIds.length }} selected net{{ selectedNetIds.length === 1 ? '' : 's' }}.
          </n-text>
        </div>

        <n-text v-if="selectedNetIds.length === 0" depth="3" class="text-xs">Select a single component to configure it.</n-text>
      </div>

      <!-- Single module -->
      <div v-else class="p-4 flex flex-col gap-6">
        <!-- Identity -->
        <div class="flex flex-col gap-1">
          <n-text strong class="text-sm">{{ selected.manifest.label }}</n-text>
          <div class="flex items-center gap-2">
            <n-tag size="small" :bordered="false">{{ selected.designator }}</n-tag>
            <n-text depth="3" class="text-xs font-mono">{{ selected.typeId }}</n-text>
          </div>
        </div>

        <!-- Configuration -->
        <div
          v-if="selected.manifest.configEditor || (selected.manifest.configSchema?.length ?? 0) > 0"
          class="flex flex-col gap-2"
        >
          <n-text strong class="text-xs uppercase tracking-widest opacity-50">Configuration</n-text>
          <component
            :is="selected.manifest.configEditor"
            v-if="selected.manifest.configEditor"
            :key="selected.designator"
            :config="selected.config"
            :designator="selected.designator"
            @update:config="applyFullConfig"
          />
          <ConfigForm
            v-else
            :schema="selected.manifest.configSchema ?? []"
            :config="selected.config"
            @update="applyConfig"
          />
        </div>
        <n-text v-else depth="3" class="text-xs">This component has no configuration.</n-text>

        <!-- Ports -->
        <div class="flex flex-col gap-2">
          <n-text strong class="text-xs uppercase tracking-widest opacity-50">Ports</n-text>
          <div class="flex flex-col gap-1.5">
            <div v-for="port in sortedPorts" :key="port.id" class="flex items-center gap-2">
              <n-tag
                size="tiny"
                :bordered="false"
                :type="port.direction === 'input' ? 'info' : 'success'"
                class="w-10 shrink-0 justify-center font-mono"
              >
                {{ port.bits }}
              </n-tag>
              <n-input
                size="tiny"
                :value="labelDrafts[port.id] ?? portLabel(selected, port)"
                @update:value="(v: string) => (labelDrafts[port.id] = v)"
                @blur="commitPortLabel(port)"
                @keydown.enter="commitPortLabel(port)"
              />
            </div>
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>
