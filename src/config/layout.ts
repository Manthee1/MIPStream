import { GroupPanelViewState, GroupviewPanelState, SerializedGridObject } from "dockview-vue";

export const defaultLayoutGridConfig = {
    "root": {
        "type": "branch",
        "data": [
            {
                "type": "branch",
                "data": [
                    {
                        "type": "leaf",
                        "data": {
                            "views": [
                                "memory"
                            ],
                            "activeView": "memory",
                            "id": "6"
                        },
                        "size": 380
                    },
                    {
                        "type": "leaf",
                        "data": {
                            "views": [
                                "registers"
                            ],
                            "activeView": "registers",
                            "id": "2"
                        },
                        "size": 524
                    }
                ],
                "size": 347
            },
            {
                "type": "branch",
                "data": [
                    {
                        "type": "leaf",
                        "data": {
                            "views": [
                                "editor"
                            ],
                            "activeView": "editor",
                            "id": "3"
                        },
                        "size": 703
                    },
                    {
                        "type": "leaf",
                        "data": {
                            "views": [
                                "problems"
                            ],
                            "activeView": "problems",
                            "id": "1"

                        },
                        "size": 201
                    }
                ],
                "size": 541
            },
            {
                "type": "branch",
                "data": [
                    {
                        "type": "leaf",
                        "data": {
                            "views": [
                                "cpuView"
                            ],
                            "activeView": "cpuView",
                            "id": "4"
                        },
                        "size": 520
                    },
                    {
                        "type": "leaf",
                        "data": {
                            "views": [
                                "instructionMemory"
                            ],
                            "activeView": "instructionMemory",
                            "id": "5"
                        },
                        "size": 384
                    }
                ],
                "size": 757
            },
            {
                "type": "leaf",
                "data": {
                    "views": [
                        "instructions"
                    ],
                    "activeView": "instructions",
                    "id": "9"
                },
                "size": 275
            }
        ],
        "size": 904
    } as SerializedGridObject<GroupPanelViewState>,
    "width": 1920,
    "height": 903,
    "orientation": "HORIZONTAL"
};



export const panelsConfig: Record<string, GroupviewPanelState> = {
    "stages": {
        "id": "stages",
        "contentComponent": "Stages",
        "title": "Stages",
        "tabComponent": "DockviewTab",
    },
    "registers": {
        "id": "registers",
        "contentComponent": "Registers",
        "title": "Registers",
        "tabComponent": "DockviewTab",
        // "params": {
        //     'tab': {
        //         'options': [
        //         ]
        //     }
        // }
    },
    "memory": {
        "id": "memory",
        "contentComponent": "Memory",
        "title": "Memory",
        "tabComponent": "DockviewTab",
    },
    "instructionMemory": {
        "id": "InstructionMemory",
        "contentComponent": "InstructionMemory",
        "title": "Instruction Memory",
        "tabComponent": "DockviewTab",
    },
    "instructions": {
        "id": "instructions",
        "contentComponent": "Instructions",
        "title": "Instructions",
        "tabComponent": "DockviewTab",
    },
    "editor": {
        "id": "editor",
        "contentComponent": "Editor",
        "title": "Editor",
        "tabComponent": "DockviewTab",

    },
    "cpuView": {
        "id": "cpuView",
        "contentComponent": "CpuView",
        "title": "CPU",
        "tabComponent": "DockviewTab",
    },
    "problems": {
        "id": "problems",
        "contentComponent": "Problems",
        "title": "Problems",
        "tabComponent": "DockviewTab",
    }
}