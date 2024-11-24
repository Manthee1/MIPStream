import { defineStore } from 'pinia'
import { settings } from '../storage/settingsStorage'



// Get all the values from the settings configuration



export const useSettingsStore = defineStore('settings', {
    state: () => ({
        ...settings,
    }),
    getters: {

    },
    actions: {

    }
})


