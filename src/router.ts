
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes.ts'
import { getRouteDropdownItems } from './assets/js/config/topbar-dropdown-items.ts';
import { useViewStore } from './stores/viewStore.ts';

export function initRouter() {
    const router = createRouter({
        history: createWebHistory(),
        routes,
    })

    const viewStore = useViewStore();
    router.beforeEach((to, from, next) => {


        const dropdownItems = getRouteDropdownItems(to.name?.toString() || '');
        viewStore.topBar.dropdownItems = dropdownItems;
        viewStore.topBar.title = to.name?.toString() || '';

        next();

    });

    return router;

}