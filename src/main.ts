import App from "./App.vue";
import { createApp } from "vue";

import { createPinia } from 'pinia'
import { useDlxStore } from './stores/dlxStore'
import { useViewStore } from './stores/viewStore'
import { useSettingsStore } from './stores/settingsStore'
import VueFeather from 'vue-feather';

import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes.ts'

const pinia = createPinia()

const router = createRouter({
    history: createWebHistory(),
    routes,
})

const app = createApp(App);


app.use(pinia);

app.use(router);

app.component(VueFeather.name ?? '', VueFeather);

// Stores
const dlxStore = useDlxStore();
const viewStore = useViewStore();
const settings = useSettingsStore();

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $dlxStore: ReturnType<typeof useDlxStore>
        $settings: ReturnType<typeof useSettingsStore>

        $viewStore: ReturnType<typeof useViewStore>
        $confirm: (title: string, message: string) => Promise<boolean>
    }
}
// @ts-ignore
window.dlxStore = dlxStore;

app.config.globalProperties.$dlxStore = dlxStore;
app.config.globalProperties.$settings = settings;

app.config.globalProperties.$viewStore = viewStore;
app.config.globalProperties.$confirm = viewStore.confirm;


app.mount("#app");



// Set dark mode
// document.documentElement.classList.add('theme-dark');