

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
                label: 'Memory Size (Bytes)',
                type: 'number',
                default: 256,
                min: 128,
                max: 1024,
                step: 1,
                description: 'Choose the memory size for the simulation.',
                icon: 'cpu'
            },
            {
                key: 'instructionMemorySize',
                label: 'Instruction Memory Size (Instructions)',
                type: 'number',
                default: 256,
                min: 128,
                max: 1024,
                step: 1,
                description: 'Choose the instruction memory size for the simulation.',
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
        name: 'Assembler',
        icon: 'code',
        settings: [
            {
                key: 'registerPrefix',
                label: 'Register Accessor Symbol',
                type: 'radio',
                default: 'R',
                options: [
                    { value: '$', label: '$' },
                    { value: 'R', label: 'R' },
                ],
                description: 'Choose the symbol used to access registers in the assembler.',
                icon: 'code'
            },
        ]
    },
    {
        name: 'Visualization',
        icon: 'eye',
        settings: [
            {
                key: 'registerValueRepresentationColumn1',
                label: 'Register Value Representation (Column 1)',
                type: 'radio',
                default: 'hex',
                options: [
                    { value: 'dec', label: 'Decimal' },
                    { value: 'unsignedDec', label: 'Unsigned Decimal' },
                    { value: 'hex', label: 'Hexadecimal' },
                    { value: 'bin', label: 'Binary' },
                ],
                description: 'Choose the value representation for the first column of the registers.',
                icon: 'cpu'
            },
            {
                key: 'registerValueRepresentationColumn2',
                label: 'Register Value Representation (Column 2)',
                type: 'radio',
                default: 'unsignedDec',
                options: [
                    { value: 'dec', label: 'Decimal' },
                    { value: 'unsignedDec', label: 'Unsigned Decimal' },
                    { value: 'hex', label: 'Hexadecimal' },
                    { value: 'bin', label: 'Binary' },
                ],
                description: 'Choose the value representation for the second column of the registers.',
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


