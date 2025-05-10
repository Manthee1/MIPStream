
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes.ts'
import { getRouteDropdownItems } from './config/topbar-dropdown-items.ts';
import { useUIStore } from './stores/UIStore.ts';
import { useProjectStore } from './stores/projectStore.ts';
import { getProject } from './services/projectsService.ts';

export function initRouter() {
    const router = createRouter({
        history: createWebHistory(import.meta.env.BASE_URL),
        routes,
    })

    const UIStore = useUIStore();
    router.beforeEach(async (to, from, next) => {


        const dropdownItems = getRouteDropdownItems(to.name?.toString() || '');
        UIStore.topBar.dropdownItems = dropdownItems;

        document.title = to.meta?.title as string ?? 'MIPStream';

        // If next is workspace, check if the project exists
        if (to.name == 'Workspace') {

            const id = parseInt(to.params.id as string);
            const project = await getProject(id);
            if (!project) {
                next({ name: 'Home' });
                return;
            }

            document.title += ' - ' + project.name;

            useProjectStore().setCurrentProject(project);
            next();
            return;
        }


        UIStore.topBar.title = document.title;
        useProjectStore().updateRecentProjects();


        next();

    });

    return router;

}