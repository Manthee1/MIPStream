import { defineStore } from 'pinia'
import { saveSetting, settings } from '../storage/settingsStorage'
// Get all the values from the settings configuration



export const useSettingsStore = defineStore('settings', {
    state: () => ({
        ...settings,
    }),
    getters: {

    },
    actions: {
        setSetting(key: string, value: any) {
            this[key] = value;
            settings[key] = value;
            saveSetting(key, value);
        },
        resetSetting(key: string) {
            this[key] = settings[key];
        },
        resetSettings() {
            Object.keys(settings).forEach(key => {
                this[key] = settings[key];
            });
        }
    }
})


