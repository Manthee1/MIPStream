<script setup lang="ts">
/** @format */

import { computed, ref } from 'vue';
import type { WiringField } from '../manifests/wiring-logic';

/**
 * Interactive "jumper board" shared by the Bit Splitter and Bit Merger
 * config editors: bit terminals of a single bus on one side, bit terminals
 * of the named fields on the other. Click a terminal then a terminal on the
 * opposite side (or drag between them) to run a jumper cable; click a
 * connected terminal to pull the jumper out.
 */

/** A clickable bit terminal on the board. */
interface Terminal {
  kind: 'bus' | 'field';
  /** Owning group id — "bus" or the field's id. */
  group: string;
  /** Bit index within the group (0 = LSB). */
  bit: number;
  /** Board coordinates of the terminal square's top-left corner. */
  x: number;
  y: number;
}

/** One rendered group stack (the bus or a single field). */
interface GroupStack {
  id: string;
  label: string;
  /** Terminal column x. */
  x: number;
  /** Header text baseline y. */
  headerY: number;
  terminals: Terminal[];
}

const props = withDefaults(
  defineProps<{
    busLabel: string;
    busBits: number;
    fields: WiringField[];
    /** Which side of the board the bus terminals render on. */
    busSide: 'left' | 'right';
    /** True when several field bits may legally tap the same bus bit (splitter overlap). */
    busFanInAllowed?: boolean;
  }>(),
  { busFanInAllowed: false }
);

const emit = defineEmits<{
  (e: 'update:fields', fields: WiringField[]): void;
}>();

// ------------------------------------------------------------ board geometry

const PITCH = 15;      // vertical distance between bit terminals
const TERM = 10;      // terminal square size
const HEADER = 14;    // group header zone height
const GROUP_GAP = 12; // vertical gap between field stacks
const PAD = 8;
const BOARD_WIDTH = 330;
const LEFT_X = 72;
const RIGHT_X = 258;

/** Terminal stacks (bus on one side, fields on the other), MSB at the top. */
const layout = computed(() => {
  const busX = props.busSide === 'left' ? LEFT_X : RIGHT_X;
  const fieldX = props.busSide === 'left' ? RIGHT_X : LEFT_X;

  const busStack: GroupStack = {
    id: 'bus',
    label: props.busLabel,
    x: busX,
    headerY: PAD + HEADER - 5,
    terminals: [],
  };
  let y = PAD + HEADER;
  for (let bit = props.busBits - 1; bit >= 0; bit--) {
    busStack.terminals.push({ kind: 'bus', group: 'bus', bit, x: busX, y });
    y += PITCH;
  }

  const fieldStacks: GroupStack[] = [];
  let fy = PAD;
  for (const field of props.fields) {
    const stack: GroupStack = {
      id: field.id,
      label: field.label || field.id,
      x: fieldX,
      headerY: fy + HEADER - 5,
      terminals: [],
    };
    fy += HEADER;
    for (let bit = field.bits - 1; bit >= 0; bit--) {
      stack.terminals.push({ kind: 'field', group: field.id, bit, x: fieldX, y: fy });
      fy += PITCH;
    }
    fy += GROUP_GAP;
    fieldStacks.push(stack);
  }

  const height = Math.max(
    PAD + HEADER + props.busBits * PITCH + PAD,
    fy === PAD ? PAD : fy - GROUP_GAP + PAD
  );

  return { busStack, fieldStacks, height };
});

// ------------------------------------------------------------------ jumpers

interface JumperLine {
  busBit: number;
  fieldBit: number;
  contested: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Bus bits targeted by more than one field bit (illegal for mergers). */
const contestedBusBits = computed<Set<number>>(() => {
  if (props.busFanInAllowed) return new Set<number>();
  const usage = new Map<number, number>();
  for (const field of props.fields) {
    for (const src of field.map) {
      if (src < 0) continue;
      usage.set(src, (usage.get(src) ?? 0) + 1);
    }
  }
  const contested = new Set<number>();
  for (const [bit, count] of usage) if (count > 1) contested.add(bit);
  return contested;
});

/** Drawn jumper cable for every field-bit -> bus-bit mapping. */
const jumperLines = computed<JumperLine[]>(() => {
  const busX = layout.value.busStack.x + TERM / 2;
  const fieldX =
    layout.value.fieldStacks[0]?.x ?? (props.busSide === 'left' ? RIGHT_X : LEFT_X);
  const lines: JumperLine[] = [];
  for (const field of props.fields) {
    const stack = layout.value.fieldStacks.find((s) => s.id === field.id);
    if (!stack) continue;
    field.map.forEach((busBit, fieldBit) => {
      if (busBit < 0) return;
      const busTerminal = layout.value.busStack.terminals.find((t) => t.bit === busBit);
      if (!busTerminal) return;
      const fieldTerminal = stack.terminals.find((t) => t.bit === fieldBit);
      if (!fieldTerminal) return;
      lines.push({
        busBit,
        fieldBit,
        contested: contestedBusBits.value.has(busBit),
        x1: busX,
        y1: busTerminal.y + TERM / 2,
        x2: fieldX + TERM / 2,
        y2: fieldTerminal.y + TERM / 2,
      });
    });
  }
  return lines;
});

// -------------------------------------------------------------- interaction

/** Armed terminal awaiting its jumper partner on the opposite side. */
const armed = ref<Terminal | null>(null);
/** Terminal where an in-progress drag started. */
const dragFrom = ref<Terminal | null>(null);

function sameTerminal(a: Terminal, b: Terminal): boolean {
  return a.kind === b.kind && a.group === b.group && a.bit === b.bit;
}

function fieldIndexById(id: string): number {
  return props.fields.findIndex((field) => field.id === id);
}

function isFieldConnected(fieldIndex: number, bit: number): boolean {
  return (props.fields[fieldIndex]?.map[bit] ?? -1) >= 0;
}

function isBusConnected(bit: number): boolean {
  return props.fields.some((field) => field.map.includes(bit));
}

function isConnected(terminal: Terminal): boolean {
  return terminal.kind === 'field'
    ? isFieldConnected(fieldIndexById(terminal.group), terminal.bit)
    : isBusConnected(terminal.bit);
}

/** Runs (or re-runs) a jumper between two opposite-side terminals. */
function connect(a: Terminal, b: Terminal): void {
  const fieldT = a.kind === 'field' ? a : b;
  const busT = a.kind === 'bus' ? a : b;
  const fieldIndex = fieldIndexById(fieldT.group);
  if (fieldIndex === -1) return;

  // One driver per bus bit unless overlap is legal (splitter fan-in, where
  // several outputs may tap the same input bit). Re-running a field bit onto
  // the bus bit it already owns stays allowed.
  if (!props.busFanInAllowed) {
    const alreadyDriven = props.fields.some((field, index) =>
      field.map.some(
        (bit, fieldBit) => bit === busT.bit && !(index === fieldIndex && fieldBit === fieldT.bit)
      )
    );
    if (alreadyDriven) return;
  }

  const fields = props.fields.map((field) => ({ ...field, map: [...field.map] }));
  fields[fieldIndex].map[fieldT.bit] = busT.bit;
  emit('update:fields', fields);
}

/** Pulls the jumper(s) attached to a terminal. */
function disconnect(terminal: Terminal): void {
  if (terminal.kind === 'field') {
    const fieldIndex = fieldIndexById(terminal.group);
    if (fieldIndex === -1) return;
    const fields = props.fields.map((field) => ({ ...field, map: [...field.map] }));
    fields[fieldIndex].map[terminal.bit] = -1;
    emit('update:fields', fields);
    return;
  }
  const fields = props.fields.map((field) => ({
    ...field,
    map: field.map.map((bit) => (bit === terminal.bit ? -1 : bit)),
  }));
  emit('update:fields', fields);
}

function onTerminalDown(terminal: Terminal): void {
  dragFrom.value = terminal;
}

function onTerminalUp(terminal: Terminal): void {
  const from = dragFrom.value;
  dragFrom.value = null;

  if (from && !sameTerminal(from, terminal)) {
    // A drag ended on another terminal: connect across sides, re-arm same side.
    if (from.kind !== terminal.kind) {
      connect(from, terminal);
      armed.value = null;
    } else {
      armed.value = terminal;
    }
    return;
  }

  // A plain click on this terminal.
  if (armed.value) {
    if (sameTerminal(armed.value, terminal)) {
      armed.value = null;
    } else if (armed.value.kind !== terminal.kind) {
      connect(armed.value, terminal);
      armed.value = null;
    } else {
      armed.value = terminal;
    }
    return;
  }

  if (isConnected(terminal)) {
    disconnect(terminal);
    return;
  }
  armed.value = terminal;
}

function onBackgroundUp(): void {
  dragFrom.value = null;
}

/** Class set for a terminal square in its current state. */
function terminalClass(terminal: Terminal): string {
  const contested = terminal.kind === 'bus' && contestedBusBits.value.has(terminal.bit);
  if (contested) return 'fill-red-500/30 stroke-red-500';
  if (armed.value && sameTerminal(armed.value, terminal)) {
    return 'fill-blue-500/40 stroke-blue-500 animate-pulse';
  }
  if (isConnected(terminal)) return 'fill-blue-500 stroke-blue-500';
  return 'fill-transparent stroke-slate-400 dark:stroke-slate-500';
}
</script>

<template>
  <div class="w-full overflow-x-auto">
    <svg
      :width="BOARD_WIDTH"
      :height="layout.height"
      class="select-none"
      @mouseup="onBackgroundUp"
    >
      <!-- Jumper cables -->
      <line
        v-for="(line, i) in jumperLines"
        :key="i"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        stroke-width="1.5"
        :class="line.contested ? 'stroke-red-500/70' : 'stroke-blue-500/60'"
      />

      <!-- Bus stack -->
      <g>
        <text
          :x="layout.busStack.x + TERM / 2"
          :y="layout.busStack.headerY"
          text-anchor="middle"
          font-size="9"
          font-weight="bold"
          class="fill-slate-500 dark:fill-slate-400 pointer-events-none"
        >
          {{ layout.busStack.label }} [{{ busBits - 1 }}:0]
        </text>
        <g v-for="terminal in layout.busStack.terminals" :key="terminal.bit">
          <text
            :x="busSide === 'left' ? terminal.x - 6 : terminal.x + TERM + 6"
            :y="terminal.y + TERM - 2"
            :text-anchor="busSide === 'left' ? 'end' : 'start'"
            font-size="8"
            class="fill-slate-500 dark:fill-slate-400 pointer-events-none"
          >
            {{ terminal.bit }}
          </text>
          <rect
            :x="terminal.x"
            :y="terminal.y"
            :width="TERM"
            :height="TERM"
            stroke-width="1.5"
            class="cursor-pointer"
            :class="terminalClass(terminal)"
            @mousedown.prevent="onTerminalDown(terminal)"
            @mouseup.stop="onTerminalUp(terminal)"
          />
        </g>
      </g>

      <!-- Field stacks -->
      <g v-for="stack in layout.fieldStacks" :key="stack.id">
        <text
          :x="stack.x + TERM / 2"
          :y="stack.headerY"
          text-anchor="middle"
          font-size="9"
          font-weight="bold"
          class="fill-slate-500 dark:fill-slate-400 pointer-events-none"
        >
          {{ stack.label }}
        </text>
        <g v-for="terminal in stack.terminals" :key="terminal.bit">
          <text
            :x="busSide === 'left' ? terminal.x + TERM + 6 : terminal.x - 6"
            :y="terminal.y + TERM - 2"
            :text-anchor="busSide === 'left' ? 'start' : 'end'"
            font-size="8"
            class="fill-slate-500 dark:fill-slate-400 pointer-events-none"
          >
            {{ terminal.bit }}
          </text>
          <rect
            :x="terminal.x"
            :y="terminal.y"
            :width="TERM"
            :height="TERM"
            stroke-width="1.5"
            class="cursor-pointer"
            :class="terminalClass(terminal)"
            @mousedown.prevent="onTerminalDown(terminal)"
            @mouseup.stop="onTerminalUp(terminal)"
          />
        </g>
      </g>
    </svg>
  </div>
</template>
