import { h } from "vue";
import { NButton, useDialog, useMessage } from "naive-ui";
import { useRouter } from "vue-router";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/UIStore";
import type { Project } from "../shared/types/project";
import { persistCurrentProject } from "./useProjectSave";
import { cancelPendingAutosave } from "./useAutosave";
import { flushLayoutWrites } from "./useLayoutPersistence";
import type { SessionPerspective } from "../storage/session-storage";

type UnsavedChoice = "save" | "discard" | "cancel";

/**
 * The single funnel for replacing the active project (opening another one,
 * reopening the same row, or creating a new one). Replacing `currentProject`
 * discards all unsaved in-memory state, so a dirty project is guarded by a
 * three-way dialog: save first, discard the changes, or cancel.
 */
export function useProjectSwitch() {
  const projectStore = useProjectStore();
  const uiStore = useUIStore();
  const dialog = useDialog();
  const message = useMessage();
  const router = useRouter();

  function confirmUnsavedSwitch(): Promise<UnsavedChoice> {
    return new Promise<UnsavedChoice>((resolve) => {
      let settled = false;
      const finish = (choice: UnsavedChoice) => {
        if (settled) return;
        settled = true;
        reactive?.destroy();
        resolve(choice);
      };
      const reactive = dialog.warning({
        title: "Unsaved changes",
        content:
          "The current project has unsaved changes. Save them before switching? " +
          "Discarding keeps the last saved state.",
        action: () =>
          h("div", { class: "flex w-full items-center justify-end gap-2" }, [
            h(
              NButton,
              { size: "small", onClick: () => finish("cancel") },
              { default: () => "Cancel" },
            ),
            h(
              NButton,
              { size: "small", type: "error", secondary: true, onClick: () => finish("discard") },
              { default: () => "Discard changes" },
            ),
            h(
              NButton,
              { size: "small", type: "primary", onClick: () => finish("save") },
              { default: () => "Save & continue" },
            ),
          ]),
        onClose: () => {
          finish("cancel");
        },
        onAfterLeave: () => {
          finish("cancel");
        },
      });
    });
  }

  /**
   * Resolves true when it is safe to replace the active project: not dirty,
   * or the user chose to save (persisted now) / discard. False = cancelled.
   */
  async function ensureSafeToSwitch(): Promise<boolean> {
    if (!projectStore.currentProject || projectStore.projectSaved) return true;

    const choice = await confirmUnsavedSwitch();
    if (choice === "cancel") return false;

    if (choice === "save") {
      const saved = await persistCurrentProject();
      if (!saved) {
        message.error("Failed to save the current project — switch cancelled.");
        return false;
      }
      message.success("Changes saved.");
    } else {
      // Discard: drop the pending background write along with the changes.
      cancelPendingAutosave();
    }
    return true;
  }

  /**
   * Guarded open: saves/discards when dirty, then activates and navigates.
   * The URL carries the project id + perspective so F5 and shared links
   * restore the session exactly.
   */
  async function openProject(
    project: Project,
    options: { perspective?: SessionPerspective } = {},
  ): Promise<boolean> {
    if (!(await ensureSafeToSwitch())) return false;

    // Persist any pending targeted layout write of the outgoing project.
    await flushLayoutWrites();

    const perspective = options.perspective ?? uiStore.perspective;
    if (options.perspective && uiStore.perspective !== options.perspective) {
      uiStore.perspective = options.perspective;
    }

    projectStore.setCurrentProject(project);
    message.success(`Loaded project: ${project.name}`);
    router.push({ path: `/workspace/${project.id}`, query: { perspective } });
    return true;
  }

  return { ensureSafeToSwitch, openProject };
}