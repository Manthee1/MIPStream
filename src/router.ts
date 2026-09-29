import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Home from './pages/Home.vue';
import Workspace from './pages/Workspace.vue';


// Minimal Router Setup
const routes: RouteRecordRaw[] = [
    { path: '/', component: Home },
    { path: '/workspace', component: Workspace },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});


// Before we navigate to the workspace route. CHeck if any project is active, if none redirect and notify. If there is and its missing a /:projectID then append it to the route





export default router;