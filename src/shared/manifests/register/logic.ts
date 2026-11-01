/** @format */

/**
 * Pure stage-register model: pin resolution, port-id derivation and the
 * port/evaluator factories shared by the manifest, the config editor and the
 * simulator's stage visualizer. No Vue / Konva runtime imports — the headless
 * engine check rig consumes this file directly (its `manifest` types are
 * erased at build time).
 */
import { clampWiringBits } from "../wiring-logic";
import type { ModuleEvaluators, PortDefinition } from "../../types/manifest";

/**
 * D-type register transfer shared by the Stage Register and Program Counter
 * manifests. The stored value is the register's output net — held by the
 * engine between clock edges.
 */
export function registerTransfer(data: number, bitWidth: number): number {
  if (bitWidth >= 32) return data >>> 0;
  if (bitWidth <= 0) return 0;
  return ((data >>> 0) & (2 ** bitWidth - 1)) >>> 0;
}

// -------------------------------------------------------------------- pins

/** Upper bound on configured pins (keeps the drawn body height sane). */
export const REGISTER_PIN_LIMIT = 16;

/** Reserved id of the implicit main D/Q pair. */
export const MAIN_PIN_ID = "main";

/** Port id of the optional synchronous reset input. */
export const RESET_PORT_ID = "rst";

/**
 * One configured pin — an input/output D/Q pair. `id` is the stable wiring
 * key the port ids of pins after the first derive from; `label` is the
 * display name drawn on the canvas.
 */
export interface RegisterPin {
  id: string;
  label?: string;
  bits: number;
}

/** Config fields the pin resolver understands (a `RegisterConfig` subset). */
export interface RegisterPinsConfig {
  /** Legacy: width of the implicit main pin when `pins` is absent. */
  bitWidth?: number;
  /** When absent or empty the register keeps the single legacy pin. */
  pins?: RegisterPin[];
  /** Toggles the synchronous reset input (`rst`) on the top edge. */
  reset?: boolean;
}

/** Full stage-register configuration (serialized, JSON-safe). */
export interface RegisterConfig extends RegisterPinsConfig {
  /** Legacy: width of the implicit main pin when `pins` is absent. */
  bitWidth: number;
  /** Per-instance port label overrides (the Inspector's port editor). */
  portLabels?: Record<string, string>;
  /**
   * Stage boundary identity for settings-managed pipeline registers.
   * `managed` marks the register as owned by the Architecture Settings
   * (non-removable, auto-created); `stageId` is its display label ("IF/ID").
   */
  managed?: true;
  stageIndex?: number;
  stageId?: string;
}

/** First unused `p1`-style pin id. */
export function nextPinId(usedIds: Iterable<string>): string {
  const used = new Set(usedIds);
  let n = 1;
  while (used.has(`p${n}`)) n += 1;
  return `p${n}`;
}

/**
 * Resolves the effective pin list. Absent/empty `pins` yields a single main
 * pin at the legacy `bitWidth` — a port shape byte-identical to pre-pin
 * projects, so saved architectures load unchanged. Widths are clamped to
 * 1–32, empty/duplicate ids of pins after the first are regenerated, and the
 * count is capped at `REGISTER_PIN_LIMIT`.
 */
export function resolveRegisterPins(config: RegisterPinsConfig): RegisterPin[] {
  if (Array.isArray(config.pins) && config.pins.length > 0) {
    const used = new Set<string>();
    return config.pins.slice(0, REGISTER_PIN_LIMIT).map((raw, index) => {
      const bits = clampWiringBits(raw?.bits);
      const id = typeof raw?.id === "string" ? raw.id.trim() : "";
      // Pin 0 is the main D/Q pair — its ports stay the legacy `d`/`q`
      // regardless of id, so any (even empty) id is accepted as-is.
      const resolved =
        index === 0 ? id || MAIN_PIN_ID : !id || used.has(id) ? nextPinId(used) : id;
      used.add(resolved);
      return { id: resolved, ...(raw?.label ? { label: raw.label } : {}), bits };
    });
  }
  return [{ id: MAIN_PIN_ID, bits: clampWiringBits(Number(config.bitWidth) || 32) }];
}

/** Input port id of the pin at `index`: the main pin keeps the legacy `d`. */
export function registerInputPortId(pin: RegisterPin, index: number): string {
  return index === 0 ? "d" : `d_${pin.id}`;
}

/** Output port id of the pin at `index`: the main pin keeps the legacy `q`. */
export function registerOutputPortId(pin: RegisterPin, index: number): string {
  return index === 0 ? "q" : `q_${pin.id}`;
}

/** Output port ids in sampling order (main pin first). */
export function registerOutputPortIds(config: RegisterPinsConfig): string[] {
  return resolveRegisterPins(config).map(registerOutputPortId);
}

/** Human name of a pin: the user label or the generated id. */
export function registerPinLabel(pin: RegisterPin, index: number): string {
  return pin.label || (index === 0 ? "D" : pin.id);
}

/** Config sanity warnings for the editor (duplicate display names). */
export function registerConfigWarnings(config: RegisterPinsConfig): string[] {
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  resolveRegisterPins(config).forEach((pin, index) => {
    const name = pin.label?.trim() || pin.id;
    const first = seen.get(name);
    if (first === undefined) seen.set(name, index);
    else warnings.push(`Pins ${first + 1} and ${index + 1} share the name "${name}".`);
  });
  return warnings;
}

// ---------------------------------------------- port/evaluator factories

/**
 * Port layout: each pin is a horizontal D/Q pair on the common 20-unit
 * pitch; the optional reset input sits on the top edge, one pitch above the
 * topmost data pin. With no `pins` configured this produces the legacy
 * single `d`/`q` shape exactly.
 */
export function generateRegisterPorts(config: RegisterConfig): PortDefinition[] {
  const pins = resolveRegisterPins(config);
  const ports: PortDefinition[] = [];

  pins.forEach((pin, index) => {
    const y = (index - (pins.length - 1) / 2) * 20;
    const name = index === 0 ? undefined : registerPinLabel(pin, index);
    ports.push({
      id: registerInputPortId(pin, index),
      direction: "input",
      bits: pin.bits,
      label: name ?? "D",
      tooltip: `Data input${name ? ` "${name}"` : ""} (${pin.bits} bit${pin.bits > 1 ? "s" : ""})`,
      position: { x: -40, y },
    });
    ports.push({
      id: registerOutputPortId(pin, index),
      direction: "output",
      bits: pin.bits,
      label: name ?? "Q",
      tooltip: `Registered output${name ? ` "${name}"` : ""} (${pin.bits} bit${pin.bits > 1 ? "s" : ""})`,
      position: { x: 40, y },
    });
  });

  if (config.reset === true) {
    ports.push({
      id: RESET_PORT_ID,
      direction: "input",
      bits: 1,
      label: "Rst",
      tooltip: "Synchronous reset — clears every pin to 0 on the rising edge",
      position: { x: 0, y: -(((pins.length - 1) / 2) * 20 + 20) },
    });
  }

  return ports;
}

/**
 * Rising-edge evaluator: every pin latches its D independently; an asserted
 * `rst` clears all outputs to 0 instead. An unconnected `rst` binds to the
 * engine's constant-zero rail, so the reset stays inert.
 */
export function createRegisterEvaluators(config: RegisterConfig): ModuleEvaluators {
  const pins = resolveRegisterPins(config);
  const hasReset = config.reset === true;
  return {
    inputPorts: [...pins.map(registerInputPortId), ...(hasReset ? [RESET_PORT_ID] : [])],
    outputPorts: pins.map(registerOutputPortId),
    clockEdge: "rising",
    evaluate: (inputs: Uint32Array): Uint32Array => {
      const outputs = new Uint32Array(pins.length);
      if (hasReset && (inputs[pins.length] & 1) === 1) return outputs;
      for (let i = 0; i < pins.length; i += 1) {
        outputs[i] = registerTransfer(inputs[i], pins[i].bits);
      }
      return outputs;
    },
  };
}
