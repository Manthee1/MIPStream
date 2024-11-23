import App from "./App.vue";
import { createApp } from "vue";

import { createPinia } from 'pinia'
import { useDlxStore } from './stores/dlxStore'
import { useViewStore } from './stores/viewStore'
import { useSettingsStore } from './stores/settingsStore'
import VueFeather from 'vue-feather';

import { initRouter } from './router'

const pinia = createPinia()


const app = createApp(App);

app.use(pinia);
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
        $router: typeof router
        $route: typeof router
    }
}
// @ts-ignore
window.dlxStore = dlxStore;

app.config.globalProperties.$dlxStore = dlxStore;
app.config.globalProperties.$settings = settings;
app.config.globalProperties.$viewStore = viewStore;
app.config.globalProperties.$confirm = viewStore.confirm;

const router = initRouter();
app.use(router);

app.component(VueFeather.name ?? '', VueFeather);



app.mount("#app");
