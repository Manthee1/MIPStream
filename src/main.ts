import App from "./App.vue";
import { createApp } from "vue";

import { createPinia } from 'pinia'
import { useDlxStore } from './stores/dlxStore'

import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes.ts'

import VueFeather from 'vue-feather';



const pinia = createPinia()

const app = createApp(App);


const router = createRouter({
    history: createWebHistory(),
    routes,
})

app.use(pinia);
const dlxStore = useDlxStore();
app.config.globalProperties.$dlxStore = dlxStore;

app.use(router);

app.component(VueFeather.name ?? '', VueFeather);

app.mount("#app");



// Set dark mode
// document.documentElement.classList.add('theme-dark');