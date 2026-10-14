/** @format */

import { useMessage } from "naive-ui";
import { useProjectStore } from "../stores/projectStore";
import { requestArchitectureSnapshot } from "../editor/core/designer-bridge";
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
 * Project-level save flow: pulls the live schematic state into the project
 * store and persists the whole project row (architecture, program, and
 * settings) to IndexedDB. Shared by the toolbar save button, the File menu,
 * and the Ctrl+S keyboard shortcut.
 */
export function useProjectSave() {
  const projectStore = useProjectStore();
  const message = useMessage();

  async function saveCurrentProject(): Promise<boolean> {
    const project = projectStore.currentProject;
    if (!project) {
      message.warning("No project is loaded to save.");
      return false;
    }

    // Pull the live schematic document into the project before persisting.
    // When no canvas is mounted the stored architecture is saved as-is.
    syncLiveArchitecture();

    try {
      await projectStore.saveProject();
      message.success("Project saved.");
      await projectStore.updateRecentProjects();
      return true;
    } catch (error) {
      console.error("Failed to save project:", error);
      message.error("Failed to save project.");
      return false;
    }
  }

  return { saveCurrentProject };
}
