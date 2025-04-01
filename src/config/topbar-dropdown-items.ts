import { defaultProjectSettings } from "../services/projectsService";
import { settings } from "../storage/settingsStorage";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/UIStore";
import { generalSettingsConfig } from "./settings/general-settings";
import { projectSettingsWindowConfig } from "./settings/project-settings";

export let dropdownItemsConfig: Record<string, DropdownItem>;

export function createConfig() {

    const UIStore = useUIStore();

    dropdownItemsConfig =
    {

        backHomeItem: {
            label: 'Back to Home',
            action: (context) => {
                context.$router.push({ name: 'Home' });
            }
        },

        newItem:
        {
            label: 'New',
            action: async (context) => {
                const project = await useProjectStore().invokeProjectSetup();
                if (!project) return;
                context.$router.push({ name: 'Workspace', params: { id: project.id } });
            }
        },
        importItem:
        {
            label: 'Import',
            action: async (context) => {
                const project = await useProjectStore().invokeProjectUpload();
                if (!project) return;
                // Make the router update even if its the same route
                context.$router.push({ name: 'Workspace', params: { id: 0 } });
                setTimeout(() => {
                    context.$router.push({ name: 'Workspace', params: { id: project.id } });
                }, 10);
            }
        },
        openRecentItem:
        {
            label: 'Open Recent',
            action: () => {
                console.log('Open clicked');
            },
            type: 'submenu',
            // TODO: Rework this to actually observe if recent projects change. Probobly will need a rework of the storage system
            get items() {
                const items: DropdownItem[] = useProjectStore().recentProjects.map((project) => {
                    return {
                        label: project.name,
                        type: 'item',
                        action: (context) => {
                            context.$router.push({ name: 'Workspace', params: { id: project.id } });
                        }
                    }
                });
                return items;
            }
        },
        saveItem:
        {
            label: 'Save',
            action: () => {
                console.log('Save clicked');
            }
        },
        saveAsItem:
        {
            label: 'Download',
            action: () => {
                console.log('Save As clicked');
            }
        },
        seperatorItem:
        {
            type: 'separator'
        },

        instructionConfig: {
            label: 'Instructions Config',
            action: (context) => {
                context.$router.push({ name: 'InstructionsConfig' });
            }
        },

        projectSettingsItem:
        {
            label: 'Project Settings',
            action: () => {
                const projectStore = useProjectStore();
                if (!projectStore.currentProject) return;
                if (!projectStore.currentProject.settings) {
                    projectStore.currentProject.settings = defaultProjectSettings;
                }
                UIStore.openSettings({ ...projectSettingsWindowConfig, settings: projectStore.currentProject.settings });
            }
        },

        settingsItem:
        {
            label: 'Settings',
            action: () => {
                UIStore.openSettings({ ...generalSettingsConfig, settings });
            }
        },

        viewsItem:
        {
            label: 'Views',
            action: () => {
            },
            type: 'submenu',
            items: [
                {
                    label: 'Instruction List',
                    action: () => {
                        UIStore.togglePanel('instructionList');
                    }
                }, {
                    label: 'CPU',
                    action: () => {
                        UIStore.togglePanel('cpuView');
                    }
                },
            ]
        },

        helpItem:
        {
            label: 'Help',
            action: () => {
                console.log('Help clicked');
            }
        },
        aboutItem:
        {
            label: 'About',
            action: () => {
                console.log('About clicked');
            }
        }
        ,
        exitItem:
        {
            label: 'Exit',
            action: async () => {
                console.log('Exit clicked');
                const confirmed = await UIStore.confirm({
                    title: 'Exit',
                    message: 'Are you sure you want to exit?',
                    confirmText: 'Exit',
                    cancelText: 'Cancel'
                });
                if (confirmed) {
                    window.close();
                }
            }
        }
    }
}


export function getRouteDropdownItems(route: string): DropdownItem[] {
    if (dropdownItemsConfig === undefined)
        createConfig();
    switch (route) {
        case 'Home':
            return [
                dropdownItemsConfig.newItem,
                dropdownItemsConfig.openRecentItem,
                dropdownItemsConfig.importItem,

                dropdownItemsConfig.seperatorItem,

                dropdownItemsConfig.instructionConfig,
                dropdownItemsConfig.settingsItem,
                dropdownItemsConfig.helpItem,
                dropdownItemsConfig.aboutItem,

                dropdownItemsConfig.seperatorItem,

                dropdownItemsConfig.exitItem

            ]
        case 'Workspace':
            return [
                dropdownItemsConfig.newItem,
                dropdownItemsConfig.openRecentItem,
                dropdownItemsConfig.saveItem,
                dropdownItemsConfig.seperatorItem,
                dropdownItemsConfig.importItem,
                dropdownItemsConfig.saveAsItem,

                dropdownItemsConfig.seperatorItem,

                dropdownItemsConfig.settingsItem,
                dropdownItemsConfig.instructionConfig,
                dropdownItemsConfig.projectSettingsItem,
                dropdownItemsConfig.helpItem,
                dropdownItemsConfig.aboutItem,

                dropdownItemsConfig.seperatorItem,

                dropdownItemsConfig.viewsItem,

                dropdownItemsConfig.seperatorItem,

                dropdownItemsConfig.backHomeItem,
                dropdownItemsConfig.exitItem
            ]

        case 'InstructionsConfig':
            return [
                dropdownItemsConfig.newItem,
                dropdownItemsConfig.openRecentItem,
                dropdownItemsConfig.seperatorItem,
                dropdownItemsConfig.settingsItem,
                dropdownItemsConfig.helpItem,
                dropdownItemsConfig.aboutItem,
                dropdownItemsConfig.seperatorItem,
                dropdownItemsConfig.backHomeItem,
                dropdownItemsConfig.exitItem
            ]

        default:
            return [];
    }
}