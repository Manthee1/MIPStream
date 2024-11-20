import { RouteRecordRaw } from 'vue-router';
import Main from '@/pages/Main.vue';


const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'Main',
        component: Main
    }
];
export default routes;