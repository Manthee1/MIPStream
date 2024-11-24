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
            action: () => {
                console.log('Open clicked');
            }
        },
        openRecentItem:
        {
            label: 'Open Recent',
            action: () => {
                console.log('Open clicked');
            },
            type: 'submenu',
            items: [
                {
                    label: 'File 1',
                    action: () => {
                        console.log('File 1 clicked');
                    }
                },
                {
                    label: 'File 2',
                    action: () => {
                        console.log('File 2 clicked');
                    }
                },
                {
                    label: 'File 3',
                    action: () => {
                        console.log('File 3 clicked');
                    }
                }
            ]
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
            label: 'Save As',
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
                const confirmed = await viewStore.confirm('Are you sure you want to exit? 🥺', '', 'Exit', 'Stay');
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