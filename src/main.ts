import App from "./App.vue";
import { createApp } from "vue";

import { createPinia } from 'pinia'
import { useSimulationStore } from './stores/simulationStore'
import { useUIStore } from './stores/UIStore'
import { useSettingsStore } from './stores/settingsStore'
import VueFeather from 'vue-feather';
import Notifications from '@kyvg/vue3-notification';
import { notify } from '@kyvg/vue3-notification';

import { initRouter } from './router'

import 'dockview-core/dist/styles/dockview.css'
import { initKeyboardHandler } from "./keyboardHandler";
import { useProjectStore } from "./stores/projectStore";

const pinia = createPinia()

const app = createApp(App);

app.use(pinia);
// Stores
const simulationStore = useSimulationStore();
const UIStore = useUIStore();
const projectStore = useProjectStore();
const settings = useSettingsStore();

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $context: typeof app.config.globalProperties
        $simulationStore: ReturnType<typeof useSimulationStore>
        $settings: ReturnType<typeof useSettingsStore>
        $UIStore: ReturnType<typeof useUIStore>
        $projectStore: ReturnType<typeof useProjectStore>
        $confirm: (data: ModalData) => Promise<boolean | string>
        $prompt: (data: ModalData) => Promise<boolean | string>
        $router: typeof router
        $route: typeof router.currentRoute
        $notify: typeof notify
    }
}
// @ts-ignore
window.simulationStore = simulationStore;

app.config.globalProperties.$context = app.config.globalProperties
app.config.globalProperties.$simulationStore = simulationStore;
app.config.globalProperties.$settings = settings;
app.config.globalProperties.$UIStore = UIStore;
app.config.globalProperties.$confirm = UIStore.confirm;
app.config.globalProperties.$prompt = UIStore.prompt;
app.config.globalProperties.$projectStore = projectStore;
// app.config.globalProperties.$notify = notify;

initKeyboardHandler();


const router = initRouter();
app.use(router);
app.use(Notifications);

app.component(VueFeather.name ?? '', VueFeather);

app.mount("#app");
