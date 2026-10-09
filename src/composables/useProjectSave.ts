/** @format */

import { useMessage } from "naive-ui";
import { useProjectStore } from "../stores/projectStore";
import { requestArchitectureSnapshot } from "../editor/core/designer-bridge";
import { serializeArchitecture } from "../shared/serialization";

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
    const snapshot = requestArchitectureSnapshot();
    if (snapshot) {
      projectStore.updateArchitecture((architecture) => {
        const serialized = serializeArchitecture(
          architecture.name,
          architecture.description,
          snapshot.modules,
          snapshot.nets,
          architecture.configuration
        );
        // Only the document changes — grid settings and the rest of the
        // configuration stay untouched.
        architecture.modules = serialized.modules;
        architecture.nets = serialized.nets;
      });
    }

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
