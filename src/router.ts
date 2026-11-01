import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Home from './pages/Home.vue';
import Workspace from './pages/Workspace.vue';
import { getProject } from './services/projectsService';
import { useProjectStore } from './stores/projectStore';
import { useUIStore } from './stores/UIStore';
import { useSettingsStore } from './stores/settingsStore';
import { getLastSession } from './storage/session-storage';

// Minimal Router Setup. The optional `:projectId` plus the `?perspective=`
// query make the workspace deep-linkable and let a launch/reload restore the
// exact session ("Resume where you left off").
const routes: RouteRecordRaw[] = [
    { path: '/', component: Home },
    { path: '/workspace/:projectId?', component: Workspace },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

/**
 * True until the first navigation completes — the auto-reopen redirect may
 * only fire on the very first one, otherwise the logo click / File ▸ Exit
 * could never reach Home.
 */
let initialLaunch = true;

/** Loads the requested project row unless it is already active. */
async function restoreProject(projectId: number): Promise<boolean> {
    const projectStore = useProjectStore();
    if (projectStore.currentProject?.id === projectId) return true;
    try {
        const project = await getProject(projectId);
        if (!project) return false;
        projectStore.setCurrentProject(project);
        return true;
    } catch (error) {
        console.error('Failed to restore project from URL:', error);
        return false;
    }
}

router.beforeEach(async (to) => {
    const isLaunch = initialLaunch;
    initialLaunch = false;

    // Launch restore: bounce "/" to the last workspace once per app launch
    // (deep links and F5 on a workspace URL restore through the param below).
    if (isLaunch && to.path === '/') {
        const settingsStore = useSettingsStore();
        const last = getLastSession();
        if (settingsStore.autoReopenLastProject !== false && last) {
            return { path: `/workspace/${last.projectId}`, query: { perspective: last.perspective } };
        }
    }

    if (to.path === '/workspace' || to.path.startsWith('/workspace/')) {
        const projectStore = useProjectStore();
        const rawId = to.params.projectId;

        if (rawId !== undefined) {
            const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
            // Unparsable or unknown id → treat as "no project" (deleted row,
            // stale bookmark) and land on Home.
            if (!Number.isInteger(id) || !(await restoreProject(id))) {
                return { path: '/' };
            }
        } else if (!projectStore.currentProject) {
            return { path: '/' };
        }

        // Apply a valid perspective query (F5 / deep link / URL edits).
        const uiStore = useUIStore();
        const perspective = to.query.perspective;
        if ((perspective === 'design' || perspective === 'simulate') && uiStore.perspective !== perspective) {
            uiStore.perspective = perspective;
        }
    }

    return true;
});

export default router;