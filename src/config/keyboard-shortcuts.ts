import { downloadProject } from "../storage/projectsStorage";
import { useProjectStore } from "../stores/projectStore";
import { useSimulationStore } from "../stores/simulationStore";
import { useUIStore } from "../stores/UIStore";

export const keyboardShortcuts = {
    "F5": () => {
        useSimulationStore().run();
    },
    "SHIFT F5": () => {
        useSimulationStore().stop();
    },
    "F9": () => {
        useSimulationStore().step();
    },
    "F10": () => {
        if (useSimulationStore().status === 'running') {
            useSimulationStore().pause();
            return;
        } useSimulationStore().resume();
    },
    "CTRL O": () => {
        useProjectStore().invokeProjectUpload();
    },
    "CTRL SHIFT N": () => {
        useProjectStore().invokeProjectSetup();
    },
    "CTRL S": () => {
        useProjectStore().saveProject();
    },
    "CTRL SHIFT S": () => {
        // downloadProject(useUIStore());
    },



};