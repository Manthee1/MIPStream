
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes.ts'
import { getRouteDropdownItems } from './config/topbar-dropdown-items.ts';
import { useUIStore } from './stores/UIStore.ts';

export function initRouter() {
    const router = createRouter({
        history: createWebHistory(),
        routes,
    })

    const UIStore = useUIStore();
    router.beforeEach((to, from, next) => {


        const dropdownItems = getRouteDropdownItems(to.name?.toString() || '');
        UIStore.topBar.dropdownItems = dropdownItems;
        UIStore.topBar.title = to.name?.toString() || '';

        next();

    });

    return router;

}