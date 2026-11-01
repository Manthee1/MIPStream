import type { ComponentItemConfig, ItemConfig, LayoutConfig } from "golden-layout";

/**
 * Reconciles a persisted Golden Layout config against the component registry
 * the current layout definition expects. Panel/editor sets are
 * architecture-driven and change between saves, so a stored layout may
 * reference component types that no longer exist and may miss new ones:
 *
 * - component items with an unknown `componentType` are dropped, along with
 *   branches emptied by the pruning (stale stack `activeItemIndex` clamps);
 * - component types present in `fallback` but missing from the saved tree are
 *   appended to the root, reusing their fallback item config (title, size);
 * - if nothing survives the pruning, `fallback` is returned as-is.
 *
 * Pure function — no Golden Layout instances, safe to test headlessly and
 * cheap to run at every mount.
 */
export function reconcileLayoutConfig(
  saved: LayoutConfig,
  fallback: LayoutConfig,
  knownComponentTypes: readonly string[],
): LayoutConfig {
  const known = new Set(knownComponentTypes);
  const clone = deepClone(saved);
  const found = new Set<string>();

  const root = clone.root;
  if (!root || !isBranchItem(root)) return deepClone(fallback);

  const pruned = pruneItem(root, known, found);
  if (pruned === null) return deepClone(fallback);

  for (const componentType of knownComponentTypes) {
    if (found.has(componentType)) continue;
    const fallbackItem = findComponentItem(fallback.root, componentType);
    if (fallbackItem) {
      pruned.content = [...(pruned.content ?? []), deepClone(fallbackItem)];
      found.add(componentType);
    }
  }

  clone.root = pruned as LayoutConfig["root"];
  return clone;
}

type BranchItem = ItemConfig & { content: ItemConfig[] };

function isBranchItem(item: ItemConfig): item is BranchItem {
  return item.type === "row" || item.type === "column" || item.type === "stack";
}

function componentTypeOf(item: ItemConfig): string {
  return String((item as ComponentItemConfig).componentType);
}

/** Returns the pruned copy of `item`, or null when nothing known remains. */
function pruneItem(item: ItemConfig, known: Set<string>, found: Set<string>): ItemConfig | null {
  if (item.type === "component") {
    const componentType = componentTypeOf(item);
    if (known.has(componentType)) {
      found.add(componentType);
      return item;
    }
    return null;
  }
  if (!isBranchItem(item)) return null;

  const content = (item.content ?? [])
    .map((child) => pruneItem(child, known, found))
    .filter((child): child is ItemConfig => child !== null);
  if (content.length === 0) return null;

  const pruned = { ...item, content } as ItemConfig & { activeItemIndex?: number };
  if (pruned.type === "stack" && (pruned.activeItemIndex ?? 0) >= content.length) {
    pruned.activeItemIndex = 0;
  }
  return pruned;
}

/** First occurrence of `componentType` in the fallback tree (BFS order). */
function findComponentItem(
  item: ItemConfig | undefined,
  componentType: string,
): ComponentItemConfig | null {
  if (!item) return null;
  if (item.type === "component" && componentTypeOf(item) === componentType) {
    return item as ComponentItemConfig;
  }
  for (const child of item.content ?? []) {
    const hit = findComponentItem(child, componentType);
    if (hit) return hit;
  }
  return null;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}