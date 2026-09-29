import { createApp } from "vue";
import { createPinia } from 'pinia';
import App from "./App.vue";
import VueKonva from 'vue-konva';

import './assets/index.css';

import router from "./router.ts";
import { initStandardManifests } from "./shared/standardManifests.ts";



// Initialize Pinia
const pinia = createPinia();


initStandardManifests();


const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(VueKonva);

app.mount("#app");

