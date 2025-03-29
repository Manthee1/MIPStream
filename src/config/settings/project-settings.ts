

// General: performance mode, cpu type, memory size
// Simulation: speed, 

import { CPUS } from "../../assets/js/core/config/cpus";
import { useProjectStore } from "../../stores/projectStore";

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
                type: 'radio',
                default: 'basic',
                options: Object.entries(CPUS).map(([key, cpu]) => ({
                    value: key,
                    label: cpu.name,
                    description: cpu.description,
                })),
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
                default: 10,
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
                key: 'registerValueRepresentation',
                label: 'Register Value Representation',
                type: 'radio',
                default: 'dec',
                options: [
                    { value: 'dec', label: 'Decimal' },
                    { value: 'hex', label: 'Hexadecimal' },
                    { value: 'bin', label: 'Binary' },
                ],
                description: 'Choose the value representation for the registers.',
                icon: 'cpu'
            },
            {
                key: 'memoryValueRepresentation',
                label: 'Memory Value Representation',
                type: 'radio',
                default: 'dec',
                options: [
                    { value: 'dec', label: 'Decimal' },
                    { value: 'hex', label: 'Hexadecimal' },
                    { value: 'bin', label: 'Binary' },
                ],
                description: 'Choose the value representation for the memory.',
                icon: 'cpu'
            },
            {
                key: 'diagramValueRepresentation',
                label: 'Diagram Value Representation',
                type: 'radio',
                default: 'dec',
                options: [
                    { value: 'dec', label: 'Decimal' },
                    { value: 'hex', label: 'Hexadecimal' },
                    { value: 'bin', label: 'Binary' },
                ],
                description: 'Choose the value representation for the diagram.',
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


export const projectSettingsWindowConfig: SettingWindowConfig = {
    tabs: projectSettingTabs,
    settings: [],
    setSetting: (key, value) => useProjectStore().setProjectSetting(key, value),
    title: 'Project Settings',
    icon: 'settings',
    description: 'Configure the settings for the project.'
};


