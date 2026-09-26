import { createApp } from "vue";
import { createPinia } from 'pinia';
import App from "./App.vue";

import './assets/index.css';
import router from "./router.ts";

// Initialize Pinia
const pinia = createPinia();



const app = createApp(App);

app.use(pinia);
app.use(router);

app.mount("#app");

