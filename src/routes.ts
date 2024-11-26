import { RouteRecordRaw } from 'vue-router';
import Workspace from '@/pages/Workspace.vue';
import Home from '@/pages/Home.vue';
import { existsProject } from './storage/projectsStorage';


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
            const project = existsProject(id);
            if (!project) next({ name: 'Home' });

            next();
        }
    },
];
export default routes;