<script setup lang="ts">
import { computed, markRaw, onMounted, shallowRef, watch } from 'vue';
import { NEmpty } from 'naive-ui';
import { getManifest } from '@/shared/manifestRegistry';
import type { SerializedModule } from '@/shared/types/manifest';
import { ensureCompiled, getEngine } from '@/composables/useSimulation';
import { documentRevision } from '@/editor/core/selection-bridge';
import { useProjectStore } from '@/stores/projectStore';
import { useSimulationStore } from '@/stores/simulationStore';
import { useEngineRevision } from '@/composables/useEngineRevision';

/**
 * Generic simulator host for a manifest panel (`ModuleManifest.panel`):
 * resolves the module instance from the live architecture, supplies the
 * resolved config (defaults + instance config — never the engine-injected
 * `state` field), the engine-owned live state, and the sampling revision
 * counter. Panels mutate the shared buffers directly and emit `update`,
 * which just bumps the revision.
 */

const props = defineProps<{ designator: string }>();

const projectStore = useProjectStore();
const simulationStore = useSimulationStore();
const { revision, bump } = useEngineRevision();

const moduleEntry = computed<SerializedModule | null>(() =>
  (projectStore.currentProject?.architecture?.modules ?? [])
    .find((module) => module.designator === props.designator) ?? null);

const manifest = computed(() =>
  moduleEntry.value ? getManifest(moduleEntry.value.typeId) : undefined);

const panelComponent = computed(() =>
  manifest.value?.panel ? markRaw(manifest.value.panel) : null);

/** Resolved config: manifest defaults + instance overrides (state stripped). */
const resolvedConfig = computed(() => {
  if (!manifest.value || !moduleEntry.value) return null;
  const merged: Record<string, unknown> = {
    ...manifest.value.defaultConfig,
    ...moduleEntry.value.config,
  };
  delete merged.state; // engine-injected runtime reference, never for the panel
  return merged;
});

// The engine owns the state object; its identity changes on every recompile.
const moduleState = shallowRef<unknown>(undefined);

function refreshState(): void {
  const engine = getEngine();
  moduleState.value = engine?.getModuleState(props.designator) ?? undefined;
}

onMounted(() => {
  ensureCompiled();
  refreshState();
});

// A committed architecture edit rebuilds the engine (and drops any loaded
// program); re-resolve the state whenever that happens, and after every
// status transition (control calls recompile lazily).
watch(documentRevision, () => {
  ensureCompiled();
  refreshState();
});
watch(() => simulationStore.status, refreshState);

const emptyDescription = computed(() => {
  if (!moduleEntry.value) return `Module '${props.designator}' not found in the architecture.`;
  if (!manifest.value) return `Unknown module type '${moduleEntry.value.typeId}'.`;
  if (!panelComponent.value) return `${manifest.value.label} has no simulator panel.`;
  if (simulationStore.compileErrors.length > 0) return `Cannot simulate: ${simulationStore.compileErrors[0]}`;
  return 'Simulation state unavailable.';
});
</script>

<template>
  <div class="h-full bg-surface overflow-hidden">
    <component
      :is="panelComponent"
      v-if="panelComponent && resolvedConfig && moduleState !== undefined"
      :config="resolvedConfig"
      :state="moduleState"
      :revision="revision"
      @update="bump"
    />
    <div v-else class="h-full w-full flex items-center justify-center">
      <n-empty :description="emptyDescription" />
    </div>
  </div>
</template>
