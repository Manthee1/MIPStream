import { defineStore } from 'pinia'
import { DropdownItem } from '../types';


// Get system theme
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
// const systemTheme = 'light';

// Add the theme to the html element
document.documentElement.classList.add(`theme-${systemTheme}`);

export const useViewStore = defineStore('view', {
    state: () => ({
        showCpuView: false,
        showSettings: false,
        theme: systemTheme as 'light' | 'dark',
        confirmModal: {
            show: false,
            title: '',
            message: '',
            onConfirm: () => { },
            confirmText: 'Confirm',
            onCancel: () => { },
            cancelText: 'Cancel',
        },
        topBar: {
            title: '',
            dropdownItems: [] as DropdownItem[]
        },
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
            const newTheme = this.theme === 'light' ? 'dark' : 'light';

            // Add a transition class to html
            document.documentElement.classList.add('theme-transition');
            this.theme = newTheme;
            document.documentElement.classList.remove('theme-light', 'theme-dark');
            document.documentElement.classList.add(`theme-${this.theme}`);
            // Remove the transition style after the transition is complete
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transition');
            }, 500);
        },
        async confirm(title: string, message?: string, confirmText?: string, cancelText?: string): Promise<boolean> {
            // If no message is provided, use the title as the message
            if (!message) {
                message = title;
                title = '';
            }
            return new Promise((resolve) => {
                this.confirmModal = {
                    show: true,
                    title,
                    message,
                    onConfirm: () => {
                        this.confirmModal.show = false;
                        resolve(true);
                    },
                    confirmText: confirmText || 'Confirm',
                    onCancel: () => {
                        this.confirmModal.show = false;
                        resolve(false);
                    },
                    cancelText: cancelText || 'Cancel',
                };
            });
        },

        setTopBar(title: string, dropdownItems: DropdownItem[]) {

            this.topBar = {
                title: title,
                dropdownItems
            };
        },

    },




})


