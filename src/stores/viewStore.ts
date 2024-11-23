import { defineStore } from 'pinia'


// Get system theme
// const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
const systemTheme = 'light';

// Add the theme to the html element
document.documentElement.classList.add(`theme-${systemTheme}`);

export const useViewStore = defineStore('view', {
    state: () => ({
        showCpuView: false,
        showSettings: false,
        theme: systemTheme as 'light' | 'dark',
    }),
    getters: {

    },
    actions: {
        toggleCpuView() {
            this.showCpuView = !this.showCpuView;
        },
        toggleSettings() {
            this.showSettings = !this.showSettings;
        },
        toggleTheme() {
            this.theme = this.theme === 'light' ? 'dark' : 'light';
            document.documentElement.classList.remove('theme-light', 'theme-dark');
            document.documentElement.classList.add(`theme-${this.theme}`);
        },

    }
})


