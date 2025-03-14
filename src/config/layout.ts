import { GroupviewPanelState } from "dockview-vue";

export const defaultLayoutGridConfig = {
    "root": {
        "type": "branch",
        "data": [
            {
                "type": "leaf",
                "data": {
                    "views": [
                        "stages",
                        "registers",
                        "memory"
                    ],
                    "activeView": "memory",
                    "id": "2"
                },
                "size": 371
            },
            {
                "type": "leaf",
                "data": {
                    "views": [
                        "editor"
                    ],
                    "activeView": "editor",
                    "id": "3"
                },
                "size": 688
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
                        "size": 586
                    },
                    {
                        "type": "leaf",
                        "data": {
                            "views": [
                                "problems"
                            ],
                            "activeView": "problems",
                            "id": "5"
                        },
                        "size": 317
                    }
                ],
                "size": 861
            }
        ],
        "size": 903
    },
    "width": 1920,
    "height": 903,
    "orientation": "HORIZONTAL"
};



export const panels: Record<string, GroupviewPanelState> = {
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
    },
    "memory": {
        "id": "memory",
        "contentComponent": "Memory",
        "title": "Memory",
        "tabComponent": "DockviewTab",
    },
    "editor": {
        "id": "editor",
        "contentComponent": "Editor",
        "title": "Editor",
        "params": {

        },
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