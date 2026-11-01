import { watch } from "vue";
import { useRouter } from "vue-router";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/UIStore";
import { setLastSession } from "../storage/session-storage";

/**
 * "Resume where you left off" mirror: whenever the active project or the
 * workspace perspective changes, the session is (a) recorded in localStorage
 * for the next launch / Home resume banner, (b) stamped onto the project row
 * in memory as `settings.lastPerspective` (rides the next save — feeds the
 * Recent Projects "Mode" column), and (c) reflected into the workspace URL
 * (`router.replace`, so history stays clean and F5 restores the session).
 *
 * Instantiated once from `App.vue`.
 */
export function useSessionPersistence() {
  const projectStore = useProjectStore();
  const uiStore = useUIStore();
  const router = useRouter();

  watch(
    () => [projectStore.currentProject?.id ?? null, uiStore.perspective] as const,
    ([projectId, perspective]) => {
      if (projectId === null) return;

      setLastSession({ projectId, perspective });

      const project = projectStore.currentProject;
      if (project) {
        project.settings = project.settings ?? {};
        if (project.settings.lastPerspective !== perspective) {
          project.settings.lastPerspective = perspective;
          projectStore.markUnsaved();
        }
      }

      // Keep the workspace URL in sync (deep-link/F5 restore). Only relevant
      // while a workspace route is active; project-open navigations already
      // carry the id via `useProjectSwitch.openProject`.
      const currentPath = router.currentRoute.value.path;
      if (currentPath === "/workspace" || currentPath.startsWith("/workspace/")) {
        void router.replace({ path: `/workspace/${projectId}`, query: { perspective } });
      }
    },
    { flush: "post" },
  );
}