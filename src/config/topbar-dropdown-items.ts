import { loadProjects } from "../storage/projectsStorage";
import { useViewStore } from "../stores/viewStore";
import { DropdownItem } from "../types";

export let dropdownItemsConfig: Record<string, DropdownItem>;

export function createConfig() {

    const viewStore = useViewStore();

    dropdownItemsConfig =
    {
        newItem:
        {
            label: 'New',
            action: () => {
                console.log('New clicked');
            }
        },
        openItem:
        {
            label: 'Open',
            action: (context) => {
                
            }
        },
        openRecentItem:
        {
            label: 'Open Recent',
            action: () => {
                console.log('Open clicked');
            },
            type: 'submenu',
            items: loadProjects(true).map((project) => {
                return {
                    label: project.name,
                    action: (context) => {
                        console.log('Open Recent clicked');
                        context.$router.push({ name: 'Workspace', params: { id: project.id } });
                    }
                }
            })
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
        settingsItem:
        {
            label: 'Settings',
            action: () => {
                viewStore.toggleSettings();
            }
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
                const confirmed = await viewStore.confirm({
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
                dropdownItemsConfig.openItem,
                dropdownItemsConfig.openRecentItem,

                dropdownItemsConfig.seperatorItem,

                dropdownItemsConfig.settingsItem,
                dropdownItemsConfig.helpItem,
                dropdownItemsConfig.aboutItem,

                dropdownItemsConfig.seperatorItem,

                dropdownItemsConfig.exitItem

            ]
        case 'Workspace':
            return [
                dropdownItemsConfig.newItem,
                dropdownItemsConfig.openItem,
                dropdownItemsConfig.openRecentItem,
                dropdownItemsConfig.saveItem,
                dropdownItemsConfig.saveAsItem,

                dropdownItemsConfig.seperatorItem,

                dropdownItemsConfig.settingsItem,
                dropdownItemsConfig.helpItem,
                dropdownItemsConfig.aboutItem,

                dropdownItemsConfig.seperatorItem,

                dropdownItemsConfig.exitItem
            ]

        default:
            return [];
    }
}