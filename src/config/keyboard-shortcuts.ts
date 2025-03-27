import { useProjectStore } from "../stores/projectStore";
import { useSimulationStore } from "../stores/simulationStore";
import { defaultLayoutGridConfig } from "./layout";

export const keyboardShortcuts: Record<string, () => void> = {
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

    "CTRL SHIFT L": async () => {
        // Reset layout
        await useProjectStore().updateProjectLayout(defaultLayoutGridConfig);
        window.location.reload();
    },



};