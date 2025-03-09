import App from "./App.vue";
import { createApp } from "vue";

import { createPinia } from 'pinia'
import { useProgramExecutionStore } from './stores/programExecutionStore'
import { useViewStore } from './stores/viewStore'
import { useSettingsStore } from './stores/settingsStore'
import VueFeather from 'vue-feather';
import Notifications from '@kyvg/vue3-notification';

import { initRouter } from './router'

import 'dockview-core/dist/styles/dockview.css'

const pinia = createPinia()

const app = createApp(App);

app.use(pinia);
// Stores
const programExecutionStore = useProgramExecutionStore();
const viewStore = useViewStore();
const settings = useSettingsStore();

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $context: typeof app.config.globalProperties
        $programExecutionStore: ReturnType<typeof useProgramExecutionStore>
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
window.programExecutionStore = programExecutionStore;

app.config.globalProperties.$context = app.config.globalProperties
app.config.globalProperties.$programExecutionStore = programExecutionStore;
app.config.globalProperties.$settings = settings;
app.config.globalProperties.$viewStore = viewStore;
app.config.globalProperties.$confirm = viewStore.confirm;
app.config.globalProperties.$prompt = viewStore.prompt;


const router = initRouter();
app.use(router);
app.use(Notifications);

app.component(VueFeather.name ?? '', VueFeather);

app.mount("#app");
