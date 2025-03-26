interface Setting {
    label: string;
    key: string;
    type: 'checkbox' | 'text' | 'number' | 'select' | 'radio';
    default: any;
    options?: { value: string, label: string, description?: string }[];
    description: string;
    icon?: string; // Added icon property
}

export interface SettingTab {
    name: string;
    icon?: string;
    description?: string;
    settings: Setting[];
}

const generalSettingTabs: SettingTab[] = [
    {
        name: 'General',
        icon: 'settings',
        settings: [
            {
                key: 'autoSave',
                label: 'Auto Save',
                type: 'checkbox',
                default: false,
                description: 'Enable or disable auto-saving of your work after any code change.',
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
        name: 'Simulation',
        icon: 'cpu',
        settings: [

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
                default: true,
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

// General: performance mode, cpu type, memory size
// Simulation: speed, 
// Visualization: value representation(dec,hex,bin) for memory/diagram/registers all individually, register nameing convention, 
export const projectSettingTabs: SettingTab[] = [
    {
        name: 'General',
        icon: 'settings',
        settings: [
            {
                key: 'performanceMode',
                label: 'Performance Mode',
                type: 'select',
                default: 'balanced',
                options: [
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'speed', label: 'Speed' },
                    { value: 'battery', label: 'Battery' },
                ],
                description: 'Choose the performance mode for the simulation.',
                icon: 'cpu'
            },
            {
                key: 'cpuType',
                label: 'CPU Type',
                type: 'select',
                default: '8-bit',
                options: [
                    { value: '8-bit', label: '8-bit' },
                    { value: '16-bit', label: '16-bit' },
                    { value: '32-bit', label: '32-bit' },
                ],
                description: 'Choose the CPU type for the simulation.',
                icon: 'cpu'
            },
            {
                key: 'memorySize',
                label: 'Memory Size',
                type: 'number',
                default: 256,
                description: 'Choose the memory size for the simulation.',
                icon: 'cpu'
            },
        ]
    },
    {
        name: 'Simulation',
        icon: 'cpu',
        settings: [
            {
                key: 'speed',
                label: 'Speed',
                type: 'number',
                default: 1,
                description: 'Choose the speed of the simulation.',
                icon: 'cpu'
            },
        ]
    },
    {
        name: 'Visualization',
        icon: 'eye',
        settings: [
            {
                key: 'valueRepresentation',
                label: 'Value Representation',
                type: 'select',
                default: 'dec',
                options: [
                    { value: 'dec', label: 'Decimal' },
                    { value: 'hex', label: 'Hexadecimal' },
                    { value: 'bin', label: 'Binary' },
                ],
                description: 'Choose the value representation for the memory, diagram, and registers.',
                icon: 'cpu'
            },
            {
                key: 'useAdvanceRegisterNaming',
                label: 'Register Naming Convention',
                description: 'Choose the register naming convention for the simulation.',
                type: "checkbox",
                default: false,
                icon: 'cpu'
            },
        ]
    }
];


export { generalSettingTabs };