import { defineStore } from 'pinia'
import { DropdownItem } from '../types';
import { settings } from '../storage/settingsStorage';


const theme = settings.theme;

// Add the theme to the html element
document.documentElement.classList.add(`theme-${theme}`);

export const useViewStore = defineStore('view', {
    state: () => ({
        showCpuView: false,
        showSettings: false,
        theme: theme,
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
        setTheme(newTheme: string) {
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


