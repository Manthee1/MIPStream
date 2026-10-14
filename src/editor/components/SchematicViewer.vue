<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import SchematicEditor from './SchematicEditor.vue';
import { getActiveDesigner } from '../core/designer-bridge';
import { setWireSignalState } from '../core/render/wire';
import { ensureCompiled, getEngine } from '@/composables/useSimulation';
import { useSimulationStore } from '@/stores/simulationStore';
import { useTheme } from '@/composables/useTheme';
import { formatWord } from '@/shared/utils/format';

/**
 * Runtime view of the architecture (Simulate perspective): the same schematic
 * canvas locked into viewer mode, with two live layers layered on top —
 *
 * 1. Signal sampling: a 60fps rAF loop reads the engine's shared `Uint32Array`
 *    and recolors nets (on/off) only when a value actually changed.
 * 2. Port probing: hovering any port shows its live value in hex / binary /
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

let frameRequestId: number | null = null;

onMounted(() => {
  if (!ensureCompiled()) notifyCompileErrors();
  startSampling();
});

onBeforeUnmount(() => {
  stopSampling();
});

/** Resolves signal colors from CSS vars — re-apply everything on theme flip. */
watch(isDark, () => lastNetValues.clear());

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
