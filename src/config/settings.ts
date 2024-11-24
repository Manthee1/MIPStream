interface Setting {
    label: string;
    key: string;
    type: 'checkbox' | 'text' | 'number' | 'select';
    default: any;
    options?: { value: string, label: string }[];
    description: string;
}

interface SettingTab {
    name: string;
    icon?: string;
    settings: Setting[];
}

const settingTabs: SettingTab[] = [
    {
        name: 'General',
        icon: 'settings',
        settings: [
            {
                key: 'useForwarding',
                label: 'Use forwarding',
                type: 'checkbox',
                default: false,
                description: 'If enabled, the emulator will forward the value from the output of the previous instruction to the input of the next instruction if that instruction is dependent on it. Otherwise, the emulator will stall the pipeline until the value is available.'
            },
        ]
    }
];

export { settingTabs };