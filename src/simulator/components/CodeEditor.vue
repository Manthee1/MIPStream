<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NButton, NEmpty, NIcon, NTag, NText } from 'naive-ui';
import { IconAlertTriangle, IconDatabaseImport } from '@tabler/icons-vue';
import { useProjectStore } from '../../stores/projectStore';
import { useSimulationStore } from '../../stores/simulationStore';
import { getProgramCounter, useSimulation } from '../../composables/useSimulation';
import { useCodeMirror } from '../../composables/useCodeMirror';
import { buildAssemblySupport, setCurrentInstructionLine } from '../language';
import type { AssemblerDiagnostic } from '../../shared/utils/errors';

/**
 * Assembly editor panel. The CodeMirror 6 instance is the permanent
 * foundation; the ISA-driven support bundle (highlighting, inline lint,
 * autocomplete, go-to-definition, current-instruction highlight) attaches
 * through `useCodeMirror`'s support compartment.
 *
 * - Binds the mapped `ProjectEditor`'s `sourceCode` (two-way; edits mark the
 *   project unsaved).
 * - Assemble/Load button surfaces the control state machine's Load action
 *   next to the code it applies to.
 * - Diagnostics strip renders the Phase 1 assembler diagnostics (line +
 *   column range) and load errors; clicking a row reveals the position in
 *   the editor.
 * - The current-instruction highlight follows the live PC mapped through
 *   the load-time `pcLineMap` while a program is loaded.
 */

const props = withDefaults(defineProps<{ editorId?: string }>(), { editorId: 'main' });

const projectStore = useProjectStore();
const simulationStore = useSimulationStore();
const { loadProgram } = useSimulation();

const editorEntry = computed(() =>
  projectStore.currentProject?.software.editors.find((entry) => entry.id === props.editorId));

const editorName = computed(() => editorEntry.value?.name ?? props.editorId);

const container = ref<HTMLDivElement | null>(null);

/** The project's ISA definition drives the whole support bundle. */
const isaConfig = computed(() =>
  projectStore.currentProject?.architecture?.configuration?.isa);

const { view, setDoc, setSupport, revealPosition } = useCodeMirror({
  container,
  initialDoc: () => editorEntry.value?.sourceCode ?? '',
  onDocChange: (doc: string) => {
    const entry = editorEntry.value;
    if (entry && entry.sourceCode !== doc) {
      entry.sourceCode = doc;
      projectStore.markUnsaved();
    }
  },
  support: () => (isaConfig.value ? buildAssemblySupport(isaConfig.value) : []),
});

// Pull external source changes into the editor (project switch / restored
// entry). User edits round-trip as no-ops (setDoc skips identical documents).
watch(() => editorEntry.value?.sourceCode, (source) => {
  if (source !== undefined) setDoc(source);
});

// An ISA edit (settings commit) swaps the support bundle in place — the
// document state, history and selection survive the reconfigure.
watch(isaConfig, (config) => {
  setSupport(config ? buildAssemblySupport(config) : []);
});

function handleLoad(): void {
  loadProgram();
}

// ------------------------------------------------------------- diagnostics

const diagnostics = computed(() => simulationStore.assemblerDiagnostics);
const loadErrors = computed(() => simulationStore.loadErrors);
const hasIssues = computed(() => diagnostics.value.length > 0 || loadErrors.value.length > 0);

function revealDiagnostic(diag: AssemblerDiagnostic): void {
  revealPosition(diag.line, diag.columnStart, diag.columnEnd);
}

// ------------------------------------------------ current-instruction line

/** This editor's instruction-index → source-line map from the last load. */
const pcLineMap = computed(() => simulationStore.loadedPrograms[props.editorId]?.pcLineMap);

let highlightedLine: number | null = null;

/**
 * Maps the live PC (byte address) through the load-time `pcLineMap` onto a
 * source line and marks it in the editor. Called on every cycle-count /
 * status / map change — while running the store's cycle count already ticks
 * once per animation frame, so no extra sampling loop is needed.
 */
function refreshCurrentInstruction(): void {
  const map = pcLineMap.value;
  const active =
    map !== undefined
    && (simulationStore.status === 'running'
      || simulationStore.status === 'paused'
      || simulationStore.status === 'finished');

  let line: number | null = null;
  if (active) {
    const pc = getProgramCounter();
    if (pc !== null) {
      const index = pc >>> 2;
      if (index >= 0 && index < map.length) line = map[index];
    }
  }

  if (line === highlightedLine) return;
  highlightedLine = line;
  view.value?.dispatch({ effects: setCurrentInstructionLine.of(line) });
}

watch([() => simulationStore.status, () => simulationStore.cycleCount, pcLineMap], refreshCurrentInstruction);

// ------------------------------------------------------------ status chip

const statusTag = computed(() => {
  switch (simulationStore.status) {
    case 'running':
      return { label: 'Running', type: 'success' as const };
    case 'paused':
      return { label: 'Paused', type: 'info' as const };
    case 'finished':
      return {
        label: `Finished @ cycle ${simulationStore.haltedAtCycle ?? simulationStore.cycleCount}`,
        type: 'warning' as const,
      };
    case 'stopped':
      return { label: 'Stopped', type: 'default' as const };
    default:
      return null;
  }
});
</script>

<template>
  <div class="h-full bg-surface flex flex-col overflow-hidden">
    <!-- Panel header: editor name, live status, load action -->
    <div class="flex items-center gap-2 px-2 py-1 border-b border-border-color shrink-0">
      <n-text depth="3" class="text-[10px] uppercase font-mono truncate">{{ editorName }}</n-text>
      <div class="flex-1 min-w-0" />
      <n-tag v-if="statusTag" size="small" :type="statusTag.type" :bordered="false">
        {{ statusTag.label }}
      </n-tag>
      <n-button size="tiny" type="primary" @click="handleLoad" title="Assemble and Load (F7)">
        <template #icon>
          <n-icon><IconDatabaseImport /></n-icon>
        </template>
        Load
      </n-button>
    </div>

    <!-- CodeMirror host -->
    <div v-if="editorEntry" ref="container" class="flex-1 min-h-0 overflow-hidden" />
    <div v-else class="flex-1 flex items-center justify-center">
      <n-empty :description="`No editor '${editorId}' in this project`" />
    </div>

    <!-- Assembler diagnostics + load errors (click to reveal in the editor) -->
    <div v-if="hasIssues" class="shrink-0 border-t border-border-color max-h-48 overflow-y-auto">
      <div
        v-for="(diag, index) in diagnostics"
        :key="`diag-${index}`"
        class="flex items-start gap-1.5 px-2 py-1 text-xs font-mono cursor-pointer hover:bg-element"
        @click="revealDiagnostic(diag)"
      >
        <n-icon size="13" class="mt-0.5 shrink-0" color="var(--color-danger)">
          <IconAlertTriangle />
        </n-icon>
        <span class="text-secondary shrink-0 tabular-nums">{{ diag.line }}:{{ diag.columnStart }}</span>
        <span class="text-primary">{{ diag.message }}</span>
      </div>
      <div
        v-for="(error, index) in loadErrors"
        :key="`load-${index}`"
        class="flex items-start gap-1.5 px-2 py-1 text-xs font-mono"
      >
        <n-icon size="13" class="mt-0.5 shrink-0" color="var(--color-danger)">
          <IconAlertTriangle />
        </n-icon>
        <span class="text-primary">{{ error }}</span>
      </div>
    </div>
  </div>
</template>

