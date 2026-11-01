/** @format */

import { useMessage } from "naive-ui";
import { toRaw } from "vue";
import { useProjectStore } from "../stores/projectStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useUIStore } from "../stores/UIStore";
import { requestArchitectureSnapshot } from "../editor/core/designer-bridge";
import { getLayoutState, type LayoutPerspective } from "../components/layout/layout-bridge";
import { serializeArchitecture } from "../shared/serialization";

/**
 * Pulls the live schematic document (modules + nets) from the active
 * designer into the project store WITHOUT persisting. Marks the project
 * unsaved, mirroring explicit-save semantics — persistence still happens on
 * `saveCurrentProject`.
 */
export function syncLiveArchitecture(): boolean {
  const projectStore = useProjectStore();
  const project = projectStore.currentProject;
  if (!project) return false;

  const snapshot = requestArchitectureSnapshot();
  if (!snapshot) return false;

  projectStore.updateArchitecture((architecture) => {
    const serialized = serializeArchitecture(
      architecture.name,
      architecture.description,
      snapshot.modules,
      snapshot.nets,
      architecture.configuration
    );
    architecture.modules = serialized.modules;
    architecture.nets = serialized.nets;
  });
  return true;
}

/**
 * Pulls the live Golden Layout arrangement of the active perspective into the
 * project store WITHOUT persisting and without marking the project unsaved
 * (layout state is not document content). Full-row saves call this first so
 * they never clobber a newer arrangement with a stale row snapshot.
 */
export function syncLiveLayouts(): void {
  const projectStore = useProjectStore();
  const uiStore = useUIStore();
  const project = projectStore.currentProject;
  if (!project) return;

  const config = getLayoutState(uiStore.perspective as LayoutPerspective);
  if (!config) return;
  // Spread the RAW layouts object so no reactive proxy is baked into the
  // store (see useLayoutPersistence.handleLayoutChange / deep-to-raw.ts).
  project.layouts = { ...toRaw(project).layouts, [uiStore.perspective]: config };
}

/**
 * Persists the current project WITHOUT any UI feedback: pulls the live
 * schematic document into the project store and writes the whole row to
 * IndexedDB. This is the silent core of every save path — explicit saves wrap
 * it with toasts and a recents refresh, autosave calls it directly. Never
 * throws; returns false when there is no project or the write failed.
 */
export async function persistCurrentProject(): Promise<boolean> {
  const projectStore = useProjectStore();
  const project = projectStore.currentProject;
  if (!project) return false;

  // Pull the live schematic document into the project before persisting.
  // When no canvas is mounted the stored architecture is saved as-is.
  syncLiveArchitecture();
  // Carry the freshest panel arrangement so the row write cannot regress it.
  syncLiveLayouts();

  try {
    await projectStore.saveProject();
    return true;
  } catch (error) {
    console.error("Failed to save project:", error);
    return false;
  }
}

/**
 * Project-level save flow: pulls the live schematic state into the project
 * store and persists the whole project row (architecture, program, and
 * settings) to IndexedDB. Shared by the toolbar save button, the File menu,
 * and the Ctrl+S keyboard shortcut.
 */
export function useProjectSave() {
  const projectStore = useProjectStore();
  const settingsStore = useSettingsStore();
  const message = useMessage();

  async function saveCurrentProject(): Promise<boolean> {
    const project = projectStore.currentProject;
    if (!project) {
      message.warning("No project is loaded to save.");
      return false;
    }

    const saved = await persistCurrentProject();
    if (!saved) {
      message.error("Failed to save project.");
      return false;
    }

    // Honors the "Project Save Notification" general setting.
    if (settingsStore.projectSaveNotification !== false) {
      message.success("Project saved.");
    }
    await projectStore.updateRecentProjects();
    return true;
  }

  return { saveCurrentProject };
}
