

// General: performance mode, cpu type, memory size
// Simulation: speed, 

import { CPUS } from "../../assets/js/core/config/cpus";
import { useProjectStore } from "../../stores/projectStore";

// Visualization: value representation(dec,hex,bin) for memory/diagram/registers all individually, register nameing convention, 
export const projectSettingTabs: SettingTab[] = [
    // {
    //     name: 'General',
    //     icon: 'settings',
    //     settings: [


    //     ]
    // },
    {
        name: 'Simulation',
        icon: 'cpu',
        settings: [
            {
                key: 'speed',
                label: 'Speed',
                type: 'number',
                default: 10,
                min: 1,
                max: 100,
                step: 1,
                description: 'Choose the speed of the simulation. Setting to 100 executes without delay.',
                icon: 'cpu'
            },
            {
                key: 'UIUpdateIntervalAtMaxSpeed',
                label: 'Update Interval at Max Speed (ms)',
                type: 'number',
                default: 100,
                min: -1,
                max: 10000,
                step: 1,
                description: `Specify how often the UI should update (in milliseconds) when the simulation is running at maximum speed.
Set to '-1' to disable updates during simulation, which will freeze the UI until the simulation is paused.`,
                icon: 'clock'
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
                label: 'Memory Size (Bytes)',
                type: 'number',
                default: 256,
                min: 128,
                max: 1024,
                step: 1,
                description: 'Choose the memory size for the simulation.',
                icon: 'cpu'
            },
            // {
            //     key: 'instructionMemorySize',
            //     label: 'Instruction Memory Size (Instructions)',
            //     type: 'number',
            //     default: 256,
            //     min: 128,
            //     max: 1024,
            //     step: 1,
            //     description: 'Choose the instruction memory size for the simulation.',
            //     icon: 'cpu'
            // },
        ]
    },
    {
        name: 'Registers',
        icon: 'columns',
        settings: [
            {
                key: 'registerPrefix',
                label: 'Prefered Register Prefix',
                type: 'radio',
                default: 'R',
                options: [
                    { value: '$', label: '$' },
                    { value: 'R', label: 'R' },
                ],
                description: 'Choose the prefered register prefix to show in the registers panel and use in code completions.',
                icon: 'code'
            },
            {
                key: 'registerNamingConvention',
                label: 'Register Naming Convention',
                type: 'radio',
                default: 'simple',
                options: [
                    { value: 'simple', label: 'Simple', description: '0, 1, 2, ...' },
                    { value: 'advanced', label: 'Advanced', description: 'zero, at, v0, ...' },
                ],
                description: 'Choose which register naming convention to show in the registers panel.',
                icon: 'cpu'
            },
            {
                key: 'registerValueRepresentationColumn1',
                label: 'Register Value Representation (Column 1)',
                type: 'radio',
                default: 'hex',
                options: [
                    { value: 'dec', label: 'Signed Decimal' },
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
                    { value: 'dec', label: 'Signed Decimal' },
                    { value: 'unsignedDec', label: 'Unsigned Decimal' },
                    { value: 'hex', label: 'Hexadecimal' },
                    { value: 'bin', label: 'Binary' },
                ],
                description: 'Choose the value representation for the second column of the registers.',
                icon: 'cpu'
            },
        ]
    },
    // Memory
    {
        name: 'Memory',
        icon: 'table',
        settings: [

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
        ]
    },
    {
        name: 'Diagram',
        icon: 'map',
        settings: [


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
                key: 'diagramShowValues',
                label: 'Show Values',
                description: 'Show values in the diagram.',
                type: 'radio',
                default: 'all',
                options: [
                    { value: 'none', label: 'None', description: 'Do not show any values' },
                    { value: 'show', label: 'All', description: 'Show all values' },
                    { value: 'boxed', label: 'Boxed', description: 'Show values in boxes' },
                ],
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
    description: 'Configure the settings for the project.',
    activeTabIndex: 0
};


