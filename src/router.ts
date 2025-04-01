
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes.ts'
import { getRouteDropdownItems } from './config/topbar-dropdown-items.ts';
import { useUIStore } from './stores/UIStore.ts';
import { useProjectStore } from './stores/projectStore.ts';
import { getProject } from './services/projectsService.ts';

export function initRouter() {
    const router = createRouter({
        history: createWebHistory(),
        routes,
    })

    const UIStore = useUIStore();
    router.beforeEach(async (to, from, next) => {


        const dropdownItems = getRouteDropdownItems(to.name?.toString() || '');
        UIStore.topBar.dropdownItems = dropdownItems;


        // If next is workspace, check if the project exists
        if (to.name == 'Workspace') {

            const id = parseInt(to.params.id as string);
            const project = await getProject(id);
            if (!project) {
                next({ name: 'Home' });
                return;
            }

            useProjectStore().setCurrentProject(project);
            next();
            return;
        }


        UIStore.topBar.title = to.name?.toString() || '';
        useProjectStore().updateRecentProjects();


        next();

    });

    return router;

}