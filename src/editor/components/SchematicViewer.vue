<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import type Konva from 'konva';
import SchematicEditor from './SchematicEditor.vue';
import { getActiveDesigner } from '../core/designer-bridge';
import type { SchematicDesigner } from '../core/designer';
import { setWireSignalState, setWireHover } from '../core/render/wire';
import { liftPortValueLabel, setPortValueLabel, setNodeHover } from '../core/render/module-node';
import { ensureCompiled, getEngine } from '@/composables/useSimulation';
import type { SimulationEngine } from '@/core/engine/engine';
import { useSimulationStore } from '@/stores/simulationStore';
import { useTheme } from '@/composables/useTheme';
import { formatWord, formatPortValue } from '@/shared/utils/format';
import StageInstructionBar from '@/simulator/components/StageInstructionBar.vue';

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
  // Hover highlights baked the old theme's colors; drop the tracking so the
  // next pointer move re-applies them with fresh theme colors.
  hoveredNetId = null;
  hoveredModuleDesignator = null;
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

/** Pointer-follow offset and clamping for the tooltip overlays. */
const TOOLTIP_OFFSET = 14;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_HEIGHT = 110;

/** Net/module info tooltip (task -532) — generic title + line list. */
interface InfoTooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  lines: string[];
}

const infoTooltip = reactive<InfoTooltipState>({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  subtitle: '',
  lines: [],
});

/** Currently hover-highlighted net id / module designator (dirty-checked). */
let hoveredNetId: string | null = null;
let hoveredModuleDesignator: string | null = null;

function handlePointerMove(event: MouseEvent): void {
  const designer = getActiveDesigner();
  const engine = getEngine();
  const container = root.value;
  if (!designer || !engine || !container) {
    hideHoverState();
    return;
  }

  const stage = designer.getStage();
  const pointer = stage.getPointerPosition();
  if (!pointer) {
    hideHoverState();
    return;
  }

  const intersections = stage.getAllIntersections(pointer);
  const portHit = intersections.find((shape) => shape.name() === 'port-hit');

  if (portHit) {
    // Ports take priority: the live-value probe, no net/module emphasis.
    clearHoverHighlights(designer);
    infoTooltip.visible = false;
    showPortProbe(portHit, event, container, engine);
    return;
  }

  tooltip.visible = false;
  updateInfoHover(designer, engine, intersections, event, container);
}

/** Port probe: live port value in hex / binary / decimal. */
function showPortProbe(
  hit: Konva.Shape,
  event: MouseEvent,
  container: HTMLDivElement,
  engine: SimulationEngine,
): void {
  const designator = hit.getParent()?.getAttr('designator') as string | undefined;
  const portId = hit.getAttr('portId') as string | undefined;
  const bits = (hit.getAttr('bits') as number | undefined) ?? 32;
  if (!designator || !portId) {
    tooltip.visible = false;
    return;
  }

  const value = engine.getPortValue(designator, portId);
  if (value === null) {
    tooltip.visible = false;
    return;
  }

  const formatted = formatWord(value, bits);
  tooltip.visible = true;
  tooltip.title = `${designator} · ${portId}`;
  tooltip.bits = bits;
  tooltip.hex = formatted.hex;
  tooltip.bin = formatted.bin;
  tooltip.dec = formatted.dec;

  positionTooltip(event, container);
}

/**
 * Net/module hover (task -532): highlights what is under the cursor — the
 * whole net (where it connects and ends) or the module body — and shows an
 * info tooltip. Wire hover takes priority over module hover.
 */
function updateInfoHover(
  designer: SchematicDesigner,
  engine: SimulationEngine,
  intersections: Konva.Shape[],
  event: MouseEvent,
  container: HTMLDivElement,
): void {
  const netId = findWireHit(designer, intersections);
  const designator = netId === null ? findModuleHit(intersections) : null;

  applyHoverHighlights(designer, netId, designator);

  if (netId !== null) {
    showNetInfo(designer, engine, netId, event, container);
  } else if (designator !== null) {
    showModuleInfo(designer, designator, event, container);
  } else {
    infoTooltip.visible = false;
  }
}

/** Finds the wire group under the cursor by walking up to the `netId` attr. */
function findWireHit(designer: SchematicDesigner, intersections: Konva.Shape[]): string | null {
  for (const shape of intersections) {
    let node: Konva.Node | null = shape;
    while (node) {
      const netId = node.getAttr('netId') as string | undefined;
      if (netId && designer.getWireNode(netId)) return netId;
      node = node.getParent();
    }
  }
  return null;
}

/** Finds the module group under the cursor (`designator` + `typeId` attrs). */
function findModuleHit(intersections: Konva.Shape[]): string | null {
  for (const shape of intersections) {
    let node: Konva.Node | null = shape;
    while (node) {
      const designator = node.getAttr('designator') as string | undefined;
      if (designator && (node.getAttr('typeId') as string | undefined)) return designator;
      node = node.getParent();
    }
  }
  return null;
}

/** Applies/clears the hover emphasis, dirty-checked per target. */
function applyHoverHighlights(
  designer: SchematicDesigner,
  netId: string | null,
  moduleDesignator: string | null,
): void {
  if (hoveredNetId !== netId) {
    if (hoveredNetId !== null) {
      const previous = designer.getWireNode(hoveredNetId);
      if (previous) setWireHover(previous, false);
    }
    hoveredNetId = netId;
    if (netId !== null) {
      const group = designer.getWireNode(netId);
      if (group) setWireHover(group, true);
    }
  }

  if (hoveredModuleDesignator !== moduleDesignator) {
    if (hoveredModuleDesignator !== null) {
      const previous = designer.getModuleNode(hoveredModuleDesignator);
      if (previous) setNodeHover(previous, false);
    }
    hoveredModuleDesignator = moduleDesignator;
    if (moduleDesignator !== null) {
      const group = designer.getModuleNode(moduleDesignator);
      if (group) setNodeHover(group, true);
    }
  }
}

function clearHoverHighlights(designer: SchematicDesigner): void {
  applyHoverHighlights(designer, null, null);
}

/** Full pointer-leave reset: highlights off, both tooltips hidden. */
function hideHoverState(): void {
  const designer = getActiveDesigner();
  if (designer) clearHoverHighlights(designer);
  tooltip.visible = false;
  infoTooltip.visible = false;
}

/** Net tooltip: live value in three formats + every module it connects. */
function showNetInfo(
  designer: SchematicDesigner,
  engine: SimulationEngine,
  netId: string,
  event: MouseEvent,
  container: HTMLDivElement,
): void {
  const net = designer.getNets().find((candidate) => candidate.id === netId);
  if (!net) {
    infoTooltip.visible = false;
    return;
  }

  const sourceModule = designer.getModule(net.source.designator);
  const sourcePort = sourceModule?.ports.find((candidate) => candidate.id === net.source.portId);
  const bits = sourcePort?.bits ?? 32;
  const formatted = formatWord(engine.getNetValue(net.id) ?? 0, bits);

  const connections = [
    `${net.source.designator}.${net.source.portId} →`,
    ...net.targets.map((target) => `→ ${target.designator}.${target.portId}`),
  ];
  const shown = connections.slice(0, 6);
  if (connections.length > shown.length) shown.push(`+ ${connections.length - shown.length} more`);

  infoTooltip.visible = true;
  infoTooltip.title = 'Net';
  infoTooltip.subtitle = `${bits}-bit · drives ${net.targets.length} input${net.targets.length === 1 ? '' : 's'}`;
  infoTooltip.lines = [formatted.hex, formatted.bin, formatted.dec, '', ...shown];

  positionTooltip(event, container);
}

/** Module tooltip: manifest identity/description + architecture config. */
function showModuleInfo(
  designer: SchematicDesigner,
  designator: string,
  event: MouseEvent,
  container: HTMLDivElement,
): void {
  const module = designer.getModule(designator);
  if (!module) {
    infoTooltip.visible = false;
    return;
  }

  infoTooltip.visible = true;
  infoTooltip.title = `${module.manifest.label} · ${designator}`;
  infoTooltip.subtitle = firstDescriptionLine(module.manifest.description);
  infoTooltip.lines = configSummary(module.config);

  positionTooltip(event, container);
}

/** First non-empty markdown line, lightly stripped for tooltip display. */
function firstDescriptionLine(description: string): string {
  const line = description
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0);
  return (line ?? '').replace(/[#*`]/g, '').trim();
}

/** Compact config summary (architecture-specific info), `managed` excluded. */
function configSummary(config: Record<string, unknown> | undefined): string[] {
  const lines = Object.entries(config ?? {})
    .filter(([key]) => key !== 'managed')
    .map(([key, value]) => {
      // Pin lists read as a count with display names, not raw JSON.
      if (key === 'pins' && Array.isArray(value)) {
        const names = value
          .map((pin) => {
            const def = pin as { label?: string; id?: string };
            return def.label ?? def.id ?? '?';
          })
          .join(', ');
        return `pins: ${value.length} (${names})`;
      }
      return `${key}: ${typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}`;
    });
  const shown = lines.slice(0, 6);
  if (lines.length > shown.length) shown.push(`+ ${lines.length - shown.length} more`);
  return shown;
}

/** Shared pointer-follow clamping for both tooltip overlays. */
function positionTooltip(event: MouseEvent, container: HTMLDivElement): void {
  const bounds = container.getBoundingClientRect();
  const offsetX = event.clientX - bounds.left + TOOLTIP_OFFSET;
  const offsetY = event.clientY - bounds.top + TOOLTIP_OFFSET;
  const x = Math.min(Math.max(0, offsetX), Math.max(0, bounds.width - TOOLTIP_WIDTH));
  const y = Math.min(Math.max(0, offsetY), Math.max(0, bounds.height - TOOLTIP_HEIGHT));
  tooltip.x = x;
  tooltip.y = y;
  infoTooltip.x = x;
  infoTooltip.y = y;
}
</script>

<template>
  <div
    ref="root"
    class="w-full h-full relative overflow-hidden flex flex-col"
    @mousemove="handlePointerMove"
    @mouseleave="hideHoverState"
  >
    <!-- Stage instruction visualizer (pipeline-config driven) -->
    <StageInstructionBar />

    <div class="flex-1 min-h-0">
      <SchematicEditor mode="viewer" />
    </div>

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

    <!-- Net / module info tooltip (hover highlight companion) -->
    <div
      v-if="infoTooltip.visible"
      class="absolute z-20 pointer-events-none select-none bg-surface border border-border-color shadow-lg px-2 py-1 max-w-[300px]"
      :style="{ left: `${infoTooltip.x}px`, top: `${infoTooltip.y}px` }"
    >
      <div class="text-xs font-semibold mb-0.5">{{ infoTooltip.title }}</div>
      <div v-if="infoTooltip.subtitle" class="text-[10px] text-secondary leading-3 mb-0.5">
        {{ infoTooltip.subtitle }}
      </div>
      <div class="text-xs font-mono leading-4">
        <div v-for="(line, index) in infoTooltip.lines" :key="index" :class="{ 'h-1': line === '' }">
          {{ line }}
        </div>
      </div>
    </div>
  </div>
</template>
