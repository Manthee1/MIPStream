import { RouteRecordRaw } from 'vue-router';
import Workspace from '@/pages/Workspace.vue';
import Home from '@/pages/Home.vue';
import CpuView from '@/components/core/CpuView.vue';


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
    {
        path: '/:pathMatch(.*)*',
        redirect: { name: 'Home' }
    }

];
export default routes;