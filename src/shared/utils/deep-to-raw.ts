import { isRef, toRaw } from "vue";

/**
 * Recursively strips Vue reactivity from a value, returning a plain,
 * structured-clone-safe object graph.
 *
 * `toRaw` only unwraps the OUTERMOST proxy. Any reactive proxy that was
 * assigned into reactive state (e.g. a Golden Layout config spread through a
 * reactive proxy, baking nested proxies into the stored object) survives a
 * bare `toRaw` and later crashes `postMessage` to the JsStore worker with
 * `DataCloneError: "Proxy object could not be cloned"`. This walks the whole
 * graph and rebuilds plain arrays / objects / Map / Set from raw values, so
 * the output can always cross a structured-clone boundary.
 *
 * Built-in structured-clone-safe values (`Date`, `RegExp`, `ArrayBuffer`,
 * typed-array views) pass through untouched — in particular `Date`, which
 * JsStore `date_time` columns must keep as real Date instances (a
 * `JSON.parse(JSON.stringify(...))` approach would stringify them).
 */
export function deepToRaw<T>(value: T): T {
  return dereactivate(value) as T;
}

function dereactivate(value: unknown): unknown {
  // A ref may be nested inside persisted state; unwrap to its inner value.
  if (isRef(value)) {
    return dereactivate(value.value);
  }

  const raw = toRaw(value);

  if (
    raw instanceof Date ||
    raw instanceof RegExp ||
    raw instanceof ArrayBuffer ||
    ArrayBuffer.isView(raw)
  ) {
    return raw;
  }

  if (Array.isArray(raw)) {
    return raw.map((entry) => dereactivate(entry));
  }

  if (raw instanceof Map) {
    const copy = new Map<unknown, unknown>();
    raw.forEach((entry, key) => copy.set(dereactivate(key), dereactivate(entry)));
    return copy;
  }

  if (raw instanceof Set) {
    const copy = new Set<unknown>();
    raw.forEach((entry) => copy.add(dereactivate(entry)));
    return copy;
  }

  if (raw !== null && typeof raw === "object") {
    const source = raw as Record<string, unknown>;
    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      copy[key] = dereactivate(source[key]);
    }
    return copy;
  }

  return raw;
}