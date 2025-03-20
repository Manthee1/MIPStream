import { RouteRecordRaw } from 'vue-router';
import Workspace from '@/pages/Workspace.vue';
import Home from '@/pages/Home.vue';
import CpuView from '@/components/core/CpuView.vue';
import { loadProject } from './storage/projectsStorage';
import { useProjectStore } from './stores/projectStore';


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
        component: Workspace,
        beforeEnter: (to, from, next) => {

            const id = to.params.id.toString();
            const project = loadProject(id);
            if (!project) {
                next({ name: 'Home' });
                return;
            }

            useProjectStore().setCurrentProject(project);
            next();
        }
    }, {
        path: '/cpu',
        name: 'CPU',
        component: CpuView
    },
];
export default routes;