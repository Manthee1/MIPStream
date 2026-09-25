import { createApp } from "vue";
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App from "./App.vue";

import './assets/index.css';

// Initialize Pinia
const pinia = createPinia();

// Minimal Router Setup
const routes = [
    { path: '/', component: () => import('./pages/Home.vue') },
    { path: '/workspace', component: () => import('./pages/Workspace.vue') },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

const app = createApp(App);

app.use(pinia);
app.use(router);

app.mount("#app");

