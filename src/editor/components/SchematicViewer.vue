<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import type Konva from 'konva';
import SchematicEditor from './SchematicEditor.vue';
import { getActiveDesigner } from '../core/designer-bridge';
import type { SchematicDesigner } from '../core/designer';
import { setWireSignalState } from '../core/render/wire';
import { liftPortValueLabel, setPortValueLabel } from '../core/render/module-node';
import { ensureCompiled, getEngine } from '@/composables/useSimulation';
import type { SimulationEngine } from '@/core/engine/engine';
import { useSimulationStore } from '@/stores/simulationStore';
import { useTheme } from '@/composables/useTheme';
import { formatWord, formatPortValue } from '@/shared/utils/format';

/**
 * Runtime view of the architecture (Simulate perspective): the same schematic
 * canvas locked into viewer mode, with live layers on top —
 *
 * 1. Signal sampling: a 60fps rAF loop reads the engine's shared `Uint32Array`
 *    and recolors nets (on/off) only when a value actually changed.
 * 2. Port value labels: the same loop writes the compact live value beside
 *    every port (1-bit controls as 0/1, buses as hex) — always visible, not
 *    only on hover.
 * 3. Port probing: hovering any port shows its live value in hex / binary /
 *    decimal, exactly as specified in UI_AND_UX §2.
 *
 * The canvas never drives the simulation; it only samples the engine.
 */

const root = ref<HTMLDivElement | null>(null);
const message = useMessage();
const simulationStore = useSimulationStore();
const { isDark } = useTheme();

/** Last applied per-net value — skips redundant Konva mutations per frame. */
const lastNetValues = new Map<string, number>();

/** Last applied per-port value — same dirty-check for the value labels. */
const lastPortValues = new Map<string, number>();

/** One per-port label target, resolved once (the viewer canvas is locked). */
interface PortLabelTarget {
  designator: string;
  portId: string;
  bits: number;
  /** The lifted label, living in the top value layer above the wires. */
  label: Konva.Text;
}

/** Cached port label targets (null until the first sample; rebuilt if empty). */
let portLabelTargets: PortLabelTarget[] | null = null;

let frameRequestId: number | null = null;

onMounted(() => {
  if (!ensureCompiled()) notifyCompileErrors();
  startSampling();
});

onBeforeUnmount(() => {
  stopSampling();
});

/** Resolves signal colors from CSS vars — re-apply everything on theme flip. */
watch(isDark, () => {
  lastNetValues.clear();
  lastPortValues.clear();
  // The designer rebuilds its nodes on theme switches; the lifted port value
  // labels belonged to the old nodes. Nulling the cache relifts the fresh
  // nodes' labels (and repaints them with the new theme fills) next frame.
  portLabelTargets = null;
});

function notifyCompileErrors(): void {
  if (simulationStore.compileErrors.length > 0) {
    message.error(`Cannot simulate: ${simulationStore.compileErrors[0]}`);
  }
}

function startSampling(): void {
  if (frameRequestId !== null) return;
  frameRequestId = requestAnimationFrame(sampleFrame);
}

function stopSampling(): void {
  if (frameRequestId !== null) {
    cancelAnimationFrame(frameRequestId);
    frameRequestId = null;
  }
}

function sampleFrame(): void {
  frameRequestId = null;
  applySignalStates();
  frameRequestId = requestAnimationFrame(sampleFrame);
}

/** Pushes live net values into the canvas; runs at display rate (60fps). */
function applySignalStates(): void {
  const designer = getActiveDesigner();
  const engine = getEngine();
  if (!designer || !engine) return;

  for (const net of designer.getNets()) {
    const value = engine.getNetValue(net.id);
    if (value === null) continue;
    // Dirty-check: recolor only nets whose value changed since last frame.
    if (lastNetValues.get(net.id) === value) continue;
    lastNetValues.set(net.id, value);

    const wire = designer.getWireNode(net.id);
    if (wire) setWireSignalState(wire, value !== 0);
  }

  applyPortValueLabels(designer, engine);
}

// ------------------------------------------------------- port value labels

/** Resolves every placed module port into a label target (once per mount). */
function buildPortLabelTargets(designer: SchematicDesigner): PortLabelTarget[] {
  const targets: PortLabelTarget[] = [];
  const valueLayer = designer.getValueLayer();
  for (const designator of designer.getModuleDesignators()) {
    const node = designer.getModuleNode(designator);
    const module = designer.getModule(designator);
    if (!node || !module) continue;
    for (const port of module.ports) {
      if (!port.position) continue;
      // Lift each label out of the module group into the top value layer so
      // the numbers render above the wires (wire groups draw after module
      // groups in the logic layer).
      const label = liftPortValueLabel(node, port.id, valueLayer);
      if (!label) continue;
      targets.push({ designator, portId: port.id, bits: port.bits, label });
    }
  }
  return targets;
}

/**
 * Writes the compact live value beside every port — always visible, not only
 * on hover. Dirty-checked per port so steady states cost nothing; the engine
 * exposes every port (undriven inputs ride the zero rail, unconnected outputs
 * ride private slots).
 */
function applyPortValueLabels(designer: SchematicDesigner, engine: SimulationEngine): void {
  if (!portLabelTargets || portLabelTargets.length === 0) {
    portLabelTargets = buildPortLabelTargets(designer);
    // A fresh cache repaints every label (also re-resolves theme fills).
    lastPortValues.clear();
  }

  for (const target of portLabelTargets) {
    const value = engine.getPortValue(target.designator, target.portId);
    if (value === null) {
      setPortValueLabel(target.label, null);
      continue;
    }

    const key = `${target.designator}:${target.portId}`;
    if (lastPortValues.get(key) === value) continue;
    lastPortValues.set(key, value);

    setPortValueLabel(target.label, formatPortValue(value, target.bits));
  }
}

// ------------------------------------------------------------- port probing

interface PortTooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  bits: number;
  hex: string;
  bin: string;
  dec: string;
}

const tooltip = reactive<PortTooltipState>({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  bits: 0,
  hex: '',
  bin: '',
  dec: '',
});

/** Pointer-follow offset and clamping for the tooltip overlay. */
const TOOLTIP_OFFSET = 14;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_HEIGHT = 110;

function handlePointerMove(event: MouseEvent): void {
  const designer = getActiveDesigner();
  const engine = getEngine();
  const container = root.value;
  if (!designer || !engine || !container) {
    hideTooltip();
    return;
  }

  const stage = designer.getStage();
  const pointer = stage.getPointerPosition();
  if (!pointer) {
    hideTooltip();
    return;
  }

  const hit = stage
    .getAllIntersections(pointer)
    .find((shape) => shape.name() === 'port-hit');

  if (!hit) {
    hideTooltip();
    return;
  }

  const designator = hit.getParent()?.getAttr('designator') as string | undefined;
  const portId = hit.getAttr('portId') as string | undefined;
  const bits = (hit.getAttr('bits') as number | undefined) ?? 32;
  if (!designator || !portId) {
    hideTooltip();
    return;
  }

  const value = engine.getPortValue(designator, portId);
  if (value === null) {
    hideTooltip();
    return;
  }

  const formatted = formatWord(value, bits);
  tooltip.visible = true;
  tooltip.title = `${designator} · ${portId}`;
  tooltip.bits = bits;
  tooltip.hex = formatted.hex;
  tooltip.bin = formatted.bin;
  tooltip.dec = formatted.dec;

  const bounds = container.getBoundingClientRect();
  const offsetX = event.clientX - bounds.left + TOOLTIP_OFFSET;
  const offsetY = event.clientY - bounds.top + TOOLTIP_OFFSET;
  tooltip.x = Math.min(Math.max(0, offsetX), Math.max(0, bounds.width - TOOLTIP_WIDTH));
  tooltip.y = Math.min(Math.max(0, offsetY), Math.max(0, bounds.height - TOOLTIP_HEIGHT));
}

function hideTooltip(): void {
  tooltip.visible = false;
}
</script>

<template>
  <div
    ref="root"
    class="w-full h-full relative overflow-hidden"
    @mousemove="handlePointerMove"
    @mouseleave="hideTooltip"
  >
    <SchematicEditor mode="viewer" />

    <!-- Runtime port probe: live value in hex / binary / decimal -->
    <div
      v-if="tooltip.visible"
      class="absolute z-20 pointer-events-none select-none bg-surface border border-border-color shadow-lg px-2 py-1"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      <div class="text-xs font-semibold mb-0.5">
        {{ tooltip.title }}
        <span class="opacity-60 font-normal">({{ tooltip.bits }}-bit)</span>
      </div>
      <div class="text-xs font-mono leading-4">
        <div>{{ tooltip.hex }}</div>
        <div>{{ tooltip.bin }}</div>
        <div>{{ tooltip.dec }}</div>
      </div>
    </div>
  </div>
</template>
