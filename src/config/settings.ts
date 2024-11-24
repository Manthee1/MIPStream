interface Setting {
    label: string;
    key: string;
    type: 'checkbox' | 'text' | 'number' | 'select';
    default: any;
    options?: { value: string, label: string }[];
    description: string;
    icon?: string; // Added icon property
}

interface SettingTab {
    name: string;
    icon?: string;
    description?: string;
    settings: Setting[];
}

const settingTabs: SettingTab[] = [
    {
        name: 'General',
        icon: 'settings',
        settings: [
            {
                key: 'language',
                label: 'Language',
                type: 'select',
                default: 'en',
                options: [
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' }
                ],
                description: 'Select the language for the application.',
            },
            {
                key: 'autoSave',
                label: 'Auto Save',
                type: 'checkbox',
                default: false,
                description: 'Enable or disable auto-saving of your work.',
                icon: 'save'
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
            },
            {
                key: 'fontSize',
                label: 'Font Size',
                type: 'number',
                default: 14,
                description: 'Set the font size for the application.',
                icon: 'type'
            }
        ]
    },
    {
        name: 'Emulator',
        icon: 'cpu',
        settings: [
            {
                key: 'useForwarding',
                label: 'Use forwarding',
                type: 'checkbox',
                default: false,
                description: 'If enabled, the emulator will forward the value from the output of the previous instruction to the input of the next instruction if that instruction is dependent on it. Otherwise, the emulator will stall the pipeline until the value is available.',
                icon: 'corner-down-right'
            },
            {
                key: 'pipelineDepth',
                label: 'Pipeline Depth',
                type: 'number',
                default: 5,
                description: 'Set the depth of the pipeline for the emulator.',
                icon: 'layers'
            }
        ]
    }
];

export { settingTabs };