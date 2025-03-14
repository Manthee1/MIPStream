import { loadProjects } from "../storage/projectsStorage";
import { useViewStore } from "../stores/viewStore";

export let dropdownItemsConfig: Record<string, DropdownItem>;

export function createConfig() {

    const viewStore = useViewStore();

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
                console.log('New clicked');
                const project = await viewStore.setupProject();
                if (!project) return;
                context.$router.push({ name: 'Workspace', params: { id: project.id } });
            }
        },
        importItem:
        {
            label: 'Import',
            action: async (context) => {
                const project = await viewStore.handleProjectUpload();
                if (!project) return;
                // Make the router update even if its the same route
                context.$router.push({ name: 'Workspace', params: { id: 0 } });
                setTimeout(() => {
                    context.$router.push({ name: 'Workspace', params: { id: project.id } });
                }, 0);
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
                dropdownItemsConfig.openRecentItem,
                dropdownItemsConfig.importItem,

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
                dropdownItemsConfig.openRecentItem,
                dropdownItemsConfig.saveItem,
                dropdownItemsConfig.seperatorItem,
                dropdownItemsConfig.importItem,
                dropdownItemsConfig.saveAsItem,

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