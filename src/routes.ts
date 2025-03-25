import { RouteRecordRaw } from 'vue-router';
import Workspace from '@/pages/Workspace.vue';
import Home from '@/pages/Home.vue';
import CpuView from '@/components/core/CpuView.vue';
import { loadProject } from './storage/projectsStorage';
import { useProjectStore } from './stores/projectStore';
import { getProject } from './db/projectsTable';


const routes: RouteRecordRaw[] = [

    {
        path: '/',
        name: 'Home',
        component: Home
    },
    // The Workspace 
    {
        path: '/workspace/:id',
        name: 'Workspace',
        props: true,
        component: Workspace
    }, {
        path: '/cpu',
        name: 'CPU',
        component: CpuView
    },
];
export default routes;