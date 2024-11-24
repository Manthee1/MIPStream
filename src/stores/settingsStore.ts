import { defineStore } from 'pinia'
import { settings } from '../config/settings';



// Get all the values from the settings configuration
const settingValues: Record<string, any> = {};
settings.forEach(tab => {
    tab.settings.forEach(setting => {
        settingValues[setting.key] = setting.default;
    });
});


export const useSettingsStore = defineStore('settings', {
    state: () => ({
        ...settingValues,
    }),
    getters: {

    },
    actions: {

    }
})


