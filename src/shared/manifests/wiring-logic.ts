/** @format */

/**
 * Shared data model and pure logic for the wiring-category bus reordering
 * components — the Bit Splitter and Bit Merger. Both map individual bits
 * between a single bus and a set of named fields, like wiring jumper
 * cables between individual bit terminals. Bus bits and field bits are
 * both indexed 0 = LSB.
 */

export const WIRING_BITS_MAX = 32;

/**
 * One named field (a splitter output or a merger input). `map[i]` is the
 * bus bit index connected to the field's bit `i`; `-1` leaves that bit
 * unconnected (reads as 0 for outputs, drives nothing for inputs).
 */
export interface WiringField {
  id: string;
  label?: string;
  bits: number;
  map: number[];
}

/** Clamps a user-entered bit width to the supported 1-32 range. */
export function clampWiringBits(bits: number): number {
  if (!Number.isFinite(bits)) return 1;
  return Math.min(WIRING_BITS_MAX, Math.max(1, Math.floor(bits)));
}

/** Structural deep copy of a field list (plain JSON data only). */
export function cloneWiringFields(fields: WiringField[]): WiringField[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    bits: field.bits,
    map: [...field.map],
  }));
}

/** First unused field id ("f1", "f2", ...). */
export function nextWiringFieldId(existingIds: string[]): string {
  const used = new Set(existingIds);
  let n = 1;
  while (used.has(`f${n}`)) n++;
  return `f${n}`;
}

/** Straight pass-through field: field bit i taps bus bit i. */
export function passThroughField(busBits: number, id = "f1"): WiringField {
  return { id, bits: busBits, map: Array.from({ length: busBits }, (_, i) => i) };
}

/** Contiguous ascending field: field bit i taps bus bit lo+i. */
export function contiguousField(hi: number, lo: number, id: string): WiringField {
  const bits = hi - lo + 1;
  return { id, bits, map: Array.from({ length: bits }, (_, i) => lo + i) };
}

/**
 * Parses a quick range preset ("31:16", "15:0", "7") into { hi, lo }.
 * Returns null when unparsable or hi < lo.
 */
export function parseRangePreset(text: string): { hi: number; lo: number } | null {
  const parts = text.split(":").map((part) => part.trim());
  if (parts.length === 0 || parts.length > 2) return null;
  if (!parts.every((part) => /^\d+$/.test(part))) return null;
  const lo = parts.length === 2 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
  const hi = parts.length === 2 ? parseInt(parts[0], 10) : lo;
  if (hi < lo) return null;
  return { hi, lo };
}

/** True when every mapped bit sits contiguously ascending (map[i] = lo + i). */
export function isContiguousField(field: WiringField): boolean {
  if (field.bits === 0) return false;
  const lo = field.map[0];
  if (lo < 0) return false;
  for (let i = 1; i < field.bits; i++) {
    if (field.map[i] !== lo + i) return false;
  }
  return true;
}

/**
 * Compact human label for a field's mapping — "[31:16]" when contiguous,
 * otherwise the first few explicit "out←in" jumper pairs.
 */
export function fieldMappingLabel(field: WiringField): string {
  if (isContiguousField(field)) return `[${field.map[0] + field.bits - 1}:${field.map[0]}]`;
  const pairs: string[] = [];
  for (let i = 0; i < field.bits; i++) {
    pairs.push(`${i}←${field.map[i] >= 0 ? field.map[i] : 0}`);
    if (pairs.length >= 3 && field.bits > 4) break;
  }
  return pairs.join(" ") + (field.bits > 4 ? "…" : "");
}

/** Full tooltip text describing a field's bit mapping. */
export function fieldMappingTooltip(field: WiringField): string {
  if (isContiguousField(field)) return `Bus bits [${field.map[0] + field.bits - 1}:${field.map[0]}]`;
  const pairs = field.map
    .map((src, i) => `bit ${i} ← bus bit ${src >= 0 ? src : "0 (unconnected)"}`)
    .join(", ");
  return `Mapping: ${pairs}`;
}

/**
 * Normalizes a raw field list into a valid one: clamped widths, per-field
 * maps resized to match, out-of-range mappings dropped, unique ids.
 */
export function sanitizeWiringFields(fields: WiringField[], busBits: number): WiringField[] {
  const used = new Set<string>();
  const result: WiringField[] = [];
  for (const raw of fields) {
    const bits = clampWiringBits(raw.bits);
    const map: number[] = [];
    for (let i = 0; i < bits; i++) {
      const src = raw.map?.[i];
      map.push(typeof src === "number" && src >= 0 && src < busBits ? Math.floor(src) : -1);
    }
    const id =
      typeof raw.id === "string" && raw.id && !used.has(raw.id)
        ? raw.id
        : nextWiringFieldId([...used]);
    used.add(id);
    result.push({ id, label: raw.label, bits, map });
  }
  return result;
}

/** Number of field bits mapped onto each bus bit. */
export function busBitUsage(fields: WiringField[]): Map<number, number> {
  const usage = new Map<number, number>();
  for (const field of fields) {
    for (const src of field.map) {
      if (src < 0) continue;
      usage.set(src, (usage.get(src) ?? 0) + 1);
    }
  }
  return usage;
}

/** Config sanity warnings shared by the splitter/merger editors. */
export function wiringFieldWarnings(
  fields: WiringField[],
  busBits: number,
  busFanInAllowed: boolean
): string[] {
  const warnings: string[] = [];
  for (const field of fields) {
    if (field.bits < 1 || field.bits > WIRING_BITS_MAX) {
      warnings.push(`Field "${field.label || field.id}" width must be 1-${WIRING_BITS_MAX}.`);
    }
    if (field.bits > busBits) {
      warnings.push(`Field "${field.label || field.id}" is wider than the bus (${busBits}).`);
    }
    if (field.map.every((src) => src < 0)) {
      warnings.push(`Field "${field.label || field.id}" is fully unmapped (always reads 0).`);
    }
  }
  if (!busFanInAllowed) {
    const contested: number[] = [];
    for (const [bit, count] of busBitUsage(fields)) {
      if (count > 1) contested.push(bit);
    }
    if (contested.length > 0) {
      contested.sort((a, b) => b - a);
      warnings.push(
        `Output bits [${contested.join(", ")}] are driven by more than one input — overlapping inputs resolve to a wired-OR.`
      );
    }
  }
  return warnings;
}

/** Extracts a field's value out of a bus word (bus bit -> field bit). */
export function remapFromBus(bus: number, field: WiringField): number {
  let out = 0;
  for (let i = 0; i < field.bits; i++) {
    const src = field.map[i];
    if (src >= 0) out |= ((bus >>> src) & 1) << i;
  }
  return out >>> 0;
}

/** Folds a field's value into an accumulating bus word (field bit -> bus bit). */
export function remapToBus(value: number, field: WiringField, acc: number): number {
  let out = acc;
  for (let i = 0; i < field.bits; i++) {
    const dst = field.map[i];
    if (dst >= 0) out |= ((value >>> i) & 1) << dst;
  }
  return out >>> 0;
}
