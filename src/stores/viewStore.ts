import { defineStore } from 'pinia'
import { DropdownItem, ModalData } from '../types';
import { settings } from '../storage/settingsStorage';


const theme = settings.theme;

// Add the theme to the html element
document.documentElement.classList.add(`theme-${theme}`);

export const useViewStore = defineStore('view', {
    state: () => ({
        showCpuView: false,
        showSettings: false,
        theme: theme,
        modalData: {} as ModalData,
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
        setTitle(title: string) {
            this.topBar.title = title;
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

        // Chacge dropdown item action
        changeDropdownItemAction(name: string, action: () => void) {
            const item = this.topBar.dropdownItems.find(item => item.label === name);
            if (item) {
                item.action = action;
            }
        },

        async confirm(data: ModalData): Promise<string | boolean> {

            return await this.modal(data.title ?? '', data.message, 'confirm', data.confirmText, data.cancelText) as boolean;
        },

        async prompt(data: ModalData): Promise<string | boolean> {
            console.log(data);

            return await this.modal(data.title ?? '', data.message, 'prompt', data.confirmText, data.cancelText, data.input, data.inputPlaceholder, data.verifyInput) as string;
        },

        async modal(title: string, message?: string, type: 'confirm' | 'prompt' = 'confirm', confirmText?: string, cancelText?: string, input?: string, inputPlaceholder?: string, verifyInput?: (input: string) => boolean | void): Promise<string | boolean> {
            console.log('modal', title, message, type, confirmText, cancelText, input, inputPlaceholder, verifyInput);

            // If no message is provided, use the title as the message
            if (!message) {
                message = title;
                title = '';
            }
            this.modalData = Object.assign(this.modalData, {
                show: true,
                title,
                message,
                type,
                confirmText: confirmText || 'Confirm',
                cancelText: cancelText || 'Cancel',
                input: input || '',
                inputPlaceholder: inputPlaceholder || '',
                verifyInput: verifyInput || (() => true),
            });

            console.log(this.modalData);


            return new Promise((resolve) => {
                this.modalData.onConfirm = () => {
                    this.modalData.show = false;
                    if (this.modalData.type === 'confirm') resolve(true);
                    resolve(this.modalData?.input || '');
                };
                this.modalData.onCancel = () => {
                    this.modalData.show = false;
                    resolve(false);
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


