import { useSettingsStore } from "../../stores/settingsStore";

export const generalSettingTabs: SettingTab[] = [
    {
        name: 'General',
        icon: 'settings',
        settings: [
            {
                key: 'autoSave',
                label: 'Auto Save',
                type: 'checkbox',
                default: true,
                description: 'Automatically save the project a few seconds after any change (canvas, code, or configuration).',
                icon: 'save'
            },
            {
                key: 'autoReopenLastProject',
                label: 'Reopen Last Project on Launch',
                type: 'checkbox',
                default: true,
                description: 'When the app starts, jump straight back into the last opened project and perspective. Home stays reachable via the logo or File > Exit.',
                icon: 'history'
            }
        ]
    },
    {
        name: 'Appearance',
        icon: 'eye',
        settings: [
            {
                key: 'theme',
                label: 'Theme',
                type: 'select',
                default: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
                options: [
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' }
                ],
                description: 'Choose the theme for the application.',
                icon: 'moon'
            }
        ]
    },
    {
        name: 'Editing',
        icon: 'edit',
        settings: [
            {
                key: 'smoothCursor',
                label: 'Smooth Cursor',
                type: 'checkbox',
                default: true,
                description: 'Make the cursor animation silky smooth.',
                icon: 'hash'
            },
            // Instant problem list update
            {
                key: 'instantProblemListUpdate',
                label: 'Instant Problem List Update',
                type: 'checkbox',
                default: false,
                description: 'Update the problem list as you type without delay.',
                icon: 'check-square'
            },

        ]
    },
    {
        name: 'Notifications',
        icon: 'bell',
        settings: [
            {
                // Project save notification
                key: 'projectSaveNotification',
                description: 'Show a notification when the project is saved.',
                label: 'Project Save Notification',
                type: 'checkbox',
                default: true,
            },
        ]
    }
];

export const generalSettingsConfig: SettingWindowConfig = {
    tabs: generalSettingTabs,
    settings: [],
    setSetting: (key, value) => useSettingsStore().setSetting(key, value),
    title: 'General Settings',
    icon: 'settings',
    description: 'Configure the settings for the application.',
    activeTabIndex: 0
};