import { ref, watch } from "vue";
import { useProjectStore } from "../stores/projectStore";
import { useSettingsStore } from "../stores/settingsStore";
import { persistCurrentProject } from "./useProjectSave";

/**
 * Debounced autosave over the shared save funnel. The project dirty flag
 * (`projectStore.projectSaved`) is the single trigger — every mutation path
 * (canvas edits, code edits, settings commits) already funnels into it.
 *
 * The composable is instantiated exactly once (from `App.vue` setup, which
 * sits above the Naive providers, so it must not use `useMessage`/`useDialog`)
 * and owns module-level bridge state, mirroring the `selection-bridge`
 * pattern: the TopBar imports the refs directly to render save status.
 */

/** Idle delay between the first unsaved change and the background write. */
const AUTOSAVE_DELAY_MS = 2000;
/** Backoff used after a failed write while the project stays dirty. */
const AUTOSAVE_RETRY_MS = 10000;

/** Timestamp of the last successful background save (null before the first). */
export const lastAutosavedAt = ref<Date | null>(null);
/** Set while background saves keep failing; cleared on the next success. */
export const autosaveError = ref<string | null>(null);

let timer: number | null = null;
let inFlight = false;
let started = false;

function clearTimer(): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
}

/** Cancels a scheduled background save (e.g. when discarding changes). */
export function cancelPendingAutosave(): void {
  clearTimer();
}

export function useAutosave() {
  const projectStore = useProjectStore();
  const settingsStore = useSettingsStore();

  function armTimer(delay: number): void {
    clearTimer();
    timer = window.setTimeout(() => {
      timer = null;
      void saveSilently();
    }, delay);
  }

  async function saveSilently(): Promise<boolean> {
    if (inFlight) return false;
    inFlight = true;
    try {
      const saved = await persistCurrentProject();
      if (saved) {
        lastAutosavedAt.value = new Date();
        autosaveError.value = null;
      } else if (projectStore.currentProject) {
        // A write failure with a live project is worth surfacing; a missing
        // project (deleted mid-debounce) is not an error.
        autosaveError.value = "Autosave failed — retrying";
      } else {
        autosaveError.value = null;
      }
      // Re-arm while the project is still dirty: mutations may have landed
      // during the write (the dirty flag never flipped back to true, so the
      // watcher below will not fire again on its own).
      if (projectStore.currentProject && !projectStore.projectSaved && settingsStore.autoSave) {
        armTimer(saved ? AUTOSAVE_DELAY_MS : AUTOSAVE_RETRY_MS);
      }
      return saved;
    } finally {
      inFlight = false;
    }
  }

  /**
   * Writes immediately when a save is pending — used when the tab is being
   * hidden or closed, since the debounce timer would otherwise never fire.
   */
  async function flushPendingAutosave(): Promise<void> {
    if (timer === null) return;
    clearTimer();
    await saveSilently();
  }

  function onDirtyChange(dirty: boolean): void {
    if (dirty && settingsStore.autoSave && projectStore.currentProject) {
      armTimer(AUTOSAVE_DELAY_MS);
    } else {
      clearTimer();
    }
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === "hidden") void flushPendingAutosave();
  }

  function onPageHide(): void {
    void flushPendingAutosave();
  }

  function onBeforeUnload(event: BeforeUnloadEvent): void {
    // Data-safety net, active even with autosave disabled: if anything is
    // still unsaved at unload time (pending debounce, failed write, or
    // explicit-save workflow), let the browser ask. IndexedDB writes cannot
    // be awaited during unload.
    if (projectStore.currentProject && !projectStore.projectSaved) {
      event.preventDefault();
      event.returnValue = "";
    }
  }

  if (!started) {
    started = true;
    // Armed on every dirty flip AND when autosave gets enabled while dirty.
    watch(
      [() => projectStore.projectSaved, () => settingsStore.autoSave],
      ([saved]) => onDirtyChange(saved === false),
    );

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
  }

  return { lastAutosavedAt, autosaveError, flushPendingAutosave, cancelPendingAutosave };
}