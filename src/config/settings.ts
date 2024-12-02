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
            }
        ]
    },
    {
        name: 'Emulator',
        icon: 'cpu',
        settings: [
            {
                key: 'useHazards',
                label: 'Use hazards',
                type: 'checkbox',
                default: false,
                description: 'If enabled the emulator will detect and resolve hazards.',
            },
            {
                key: 'useForwarding',
                label: 'Use forwarding',
                type: 'checkbox',
                default: false,
                description: 'If enabled, the emulator will forward the value from the output of the previous instruction to the input of the next instruction if that instruction is dependent on it. Otherwise, the emulator will stall the pipeline until the value is available.',
                icon: 'corner-down-right'
            },
            {
                key: 'warnOnOverUnderflow',
                label: 'Warn On Over/Underflow',
                type: 'checkbox',
                default: true,
                description: 'Warn the user if a register overflows or underflows.',
                icon: 'alert-triangle'
            },
        ]
    },
    {
        name: 'Editor',
        icon: 'edit',
        settings: [
            {
                key: 'fontSize',
                label: 'Font Size',
                type: 'number',
                default: 14,
                description: 'The size of the font in the editor.',
                icon: 'type'
            },
            {
                key: 'tabSize',
                label: 'Tab Size',
                type: 'number',
                default: 4,
                description: 'The number of spaces to insert when pressing the tab key.',
                icon: 'corner-up-right'
            },
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
                default: true,
                description: 'Update the problem list as you type without delay.',
                icon: 'check-square'
            },

        ]
    }
];

export { settingTabs };