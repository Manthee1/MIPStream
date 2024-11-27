import App from "./App.vue";
import { createApp } from "vue";

import { createPinia } from 'pinia'
import { useDlxStore } from './stores/dlxStore'
import { useViewStore } from './stores/viewStore'
import { useSettingsStore } from './stores/settingsStore'
import VueFeather from 'vue-feather';
import Notifications from 'vue-notification'

import { initRouter } from './router'
import { ModalData } from "./types";

const pinia = createPinia()

const app = createApp(App);

app.use(pinia);
// Stores
const dlxStore = useDlxStore();
const viewStore = useViewStore();
const settings = useSettingsStore();

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $context: typeof app.config.globalProperties
        $dlxStore: ReturnType<typeof useDlxStore>
        $settings: ReturnType<typeof useSettingsStore>
        $viewStore: ReturnType<typeof useViewStore>
        $confirm: (data: ModalData) => Promise<boolean | string>
        $prompt: (data: ModalData) => Promise<boolean | string>
        $router: typeof router
        $route: typeof router.currentRoute
        $notify: (options: NotificationOptions | string) => void
    }
}
// @ts-ignore
window.dlxStore = dlxStore;

app.config.globalProperties.$context = app.config.globalProperties
app.config.globalProperties.$dlxStore = dlxStore;
app.config.globalProperties.$settings = settings;
app.config.globalProperties.$viewStore = viewStore;
app.config.globalProperties.$confirm = viewStore.confirm;
app.config.globalProperties.$prompt = viewStore.prompt;

const router = initRouter();
app.use(router);
app.use(Notifications);

app.component(VueFeather.name ?? '', VueFeather);

app.mount("#app");
