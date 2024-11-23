import { RouteRecordRaw } from 'vue-router';
import Workspace from '@/pages/Workspace.vue';
import Home from '@/pages/Home.vue';


const routes: RouteRecordRaw[] = [

    {
        path: '/',
        name: 'Home',
        component: Home
    },
    // The Workspace 
    {
        path: '/workspace',
        name: 'Workspace',
        component: Workspace
    },
];
export default routes;