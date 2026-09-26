import { createRouter, createWebHistory } from 'vue-router';
import Home from './pages/Home.vue';
import Workspace from './pages/Workspace.vue';


// Minimal Router Setup
const routes = [
    { path: '/', component: () => Home },
    { path: '/workspace', component: () => Workspace },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});


export default router;