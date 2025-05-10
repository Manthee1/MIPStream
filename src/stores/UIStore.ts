import { defineStore } from 'pinia'
import { settings } from '../storage/settingsStorage';
import { useRouter } from 'vue-router';
import { useNotification } from '@kyvg/vue3-notification';
import { DockviewApi, GroupviewPanelState, IDockviewPanel } from 'dockview-vue';
import { panelsConfig } from '../config/layout';
import { useProjectStore } from './projectStore';
import { defaultProjectSettings } from '../services/projectsService';
import { projectSettingsWindowConfig } from '../config/settings/project-settings';
import { generalSettingsConfig } from '../config/settings/general-settings';


const theme = settings.theme;

// Add the theme to the html element
document.documentElement.classList.add(`theme-${theme}`);

const themeColorMeta = document.querySelector('meta[name="theme-color"]');
if (themeColorMeta)
    themeColorMeta.setAttribute('content', theme === 'dark' ? '#141517' : '#ffffff');


export const useUIStore = defineStore('ui', {
    state: () => ({
        showProjectSettings: false,
        showSettings: false,
        showHelp: false,
        settingsWindowConfig: {} as SettingWindowConfig,
        theme: theme,
        modalData: {} as ModalData,
        dropdownData: { id: '', show: false, items: [] as DropdownItem[], compact: false, y: 0, x: 0 },
        topBar: {
            title: '',
            dropdownItems: [] as DropdownItem[]
        },
        dockviewApi: {} as DockviewApi,
    }),
    getters: {

    },
    actions: {
        openSettings(config: SettingWindowConfig) {
            this.closeHelp();
            this.settingsWindowConfig = config;
            this.showSettings = true;
        },
        closeSettings() {
            this.showSettings = false;
        },

        openProjectSettings() {
            useUIStore().closeSettings();
            const projectStore = useProjectStore();
            if (!projectStore.currentProject) return;
            if (!projectStore.currentProject.settings) {
                projectStore.currentProject.settings = defaultProjectSettings;
            }
            projectSettingsWindowConfig.settings = projectStore.currentProject.settings;
            this.openSettings(projectSettingsWindowConfig);
        },

        openGeneralSettings() {
            useUIStore().closeSettings();
            generalSettingsConfig.settings = settings;
            this.openSettings(generalSettingsConfig);
        },

        openHelp() {
            this.closeSettings();
            this.showHelp = true;
        },
        closeHelp() {
            this.showHelp = false;
        },

        setTitle(title: string) {
            this.topBar.title = title;
        },

        setTheme(newTheme: string) {
            document.documentElement.classList.add('theme-transition');
            this.theme = newTheme;
            document.documentElement.classList.remove('theme-light', 'theme-dark');
            document.documentElement.classList.add(`theme-${this.theme}`);

            // Update the theme_color for PWA
            const themeColorMeta = document.querySelector('meta[name="theme-color"]');
            if (themeColorMeta)
                themeColorMeta.setAttribute('content', newTheme === 'dark' ? '#141517' : '#ffffff');

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

        async confirm(data: ModalData) {
            Object.assign(data, { type: 'confirm' });
            return await this.modal(data) as boolean;
        },

        async prompt(data: ModalData) {
            console.log(data);
            Object.assign(data, { type: 'prompt' });
            return await this.modal(data);
        },

        async modal(data: ModalData): Promise<string | boolean> {
            console.log('modal', data);

            // If no message is provided, use the title as the message
            if (!data.message) {
                data.message = data.title;
                data.title = '';
            }
            this.modalData = Object.assign({
                show: true,
                title: data.title,
                message: data.message,
                type: data.type,
                confirmText: data.confirmText || 'Confirm',
                confirmButtonType: data.confirmButtonType || 'accent',
                cancelText: data.cancelText || 'Cancel',
                cancelButtonType: data.cancelButtonType || 'default',
                input: data.input || '',
                inputPlaceholder: data.inputPlaceholder || '',
                verifyInput: data.verifyInput || (() => true),
            }, data);

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

        togglePanel(panelId: string) {
            const panelConfig = panelsConfig[panelId];
            if (!panelConfig) return;
            console.log('Toggle Panel', panelConfig, this.dockviewApi);

            const panelState = this.dockviewApi.getPanel(panelId);
            console.log('Panel State', panelState);
            if (!panelState) return;
            // panelState.api.set
            // if (panelState.api.isVisible) {
            //     panelState.api.maximize();
            //     setTimeout(() => {
            //         panelState.api.exitMaximized();
            //     }, 10);

            // }

        },

        setTopBar(title: string, dropdownItems: DropdownItem[]) {

            this.topBar = {
                title: title,
                dropdownItems
            };
        },
    },
})


