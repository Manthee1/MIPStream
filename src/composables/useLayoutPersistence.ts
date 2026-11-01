import type { LayoutConfig } from "golden-layout";
import { toRaw } from "vue";
import { useProjectStore } from "../stores/projectStore";
import { updateProjectLayouts } from "../services/projectsService";
import type { PersistedLayoutConfig, ProjectLayouts } from "../shared/types/project";
import type { LayoutPerspective } from "../components/layout/layout-bridge";

/**
 * Per-project Golden Layout persistence.
 *
 * Layout changes are deliberately NOT unsaved content: a panel drag should
 * not dirty the document (no `*` in the title, no history entry, no
 * `updatedAt` bump that would reshuffle recents). Instead:
 *
 * - the new arrangement is mirrored into `project.layouts[perspective]`
 *   in-memory immediately (so full-row saves always carry it —
 *   `persistCurrentProject` refreshes from the live instance first);
 * - while the project is otherwise clean, a debounced targeted write updates
 *   only the `layouts` column (no `updatedAt` stamp);
 * - while the project is dirty, the targeted write is skipped — the pending
 *   autosave/explicit save persists the row including the arrangement.
 *
 * Pending writes flush on pagehide, on project switch, and on layout unmount
 * (the final state is emitted synchronously by `GoldenLayout.vue`).
 */

const PERSIST_DELAY_MS = 1000;

interface PendingLayoutWrite {
  projectId: number;
  layouts: ProjectLayouts;
}

const pendingWrites: Partial<Record<LayoutPerspective, PendingLayoutWrite>> = {};
const pendingTimers: Partial<Record<LayoutPerspective, number>> = {};
let started = false;

async function writePending(perspective: LayoutPerspective): Promise<void> {
  const pending = pendingWrites[perspective];
  delete pendingWrites[perspective];
  window.clearTimeout(pendingTimers[perspective] ?? undefined);
  delete pendingTimers[perspective];
  if (!pending) return;
  try {
    await updateProjectLayouts(pending.projectId, pending.layouts);
  } catch (error) {
    console.error(`Failed to persist ${perspective} layout:`, error);
  }
}

/** Writes any pending targeted layout updates immediately. */
export async function flushLayoutWrites(): Promise<void> {
  const perspectives = Object.keys(pendingWrites) as LayoutPerspective[];
  await Promise.all(perspectives.map((perspective) => writePending(perspective)));
}

function scheduleWrite(perspective: LayoutPerspective, projectId: number, layouts: ProjectLayouts): void {
  pendingWrites[perspective] = { projectId, layouts };
  window.clearTimeout(pendingTimers[perspective] ?? undefined);
  pendingTimers[perspective] = window.setTimeout(() => {
    void writePending(perspective);
  }, PERSIST_DELAY_MS);
}

export function useLayoutPersistence() {
  const projectStore = useProjectStore();

  if (!started) {
    started = true;
    window.addEventListener("pagehide", () => {
      void flushLayoutWrites();
    });
  }

  /** Called with the debounced live arrangement from `GoldenLayout.vue`. */
  function handleLayoutChange(perspective: LayoutPerspective, config: LayoutConfig): void {
    const project = projectStore.currentProject;
    if (!project) return;
    const persisted = config as unknown as PersistedLayoutConfig;
    // Spread the RAW layouts object: spreading the reactive proxy would run
    // every value through Vue's reactive get trap, baking nested proxies into
    // the store and crashing the later IndexedDB write (DataCloneError).
    const layouts: ProjectLayouts = { ...toRaw(project).layouts, [perspective]: persisted };
    project.layouts = layouts;
    if (projectStore.projectSaved) {
      scheduleWrite(perspective, project.id, layouts);
    }
    // Dirty project: no targeted write — the pending autosave/explicit save
    // carries the arrangement (persistCurrentProject syncs the live state).
  }

  return { handleLayoutChange, flushLayoutWrites };
}