import { downloadProject } from "../storage/projectsStorage";
import { useProgramExecutionStore } from "../stores/programExecutionStore";
import { useViewStore } from "../stores/viewStore";

export const keyboardShortcuts = {
    "F5": () => {
        useProgramExecutionStore().run();
    },
    "SHIFT F5": () => {
        useProgramExecutionStore().stop();
    },
    "F9": () => {
        useProgramExecutionStore().step();
    },
    "F10": () => {
        if (useProgramExecutionStore().status === 'running') {
            useProgramExecutionStore().pause();
            return;
        } useProgramExecutionStore().resume();
    },
    "CTRL O": () => {
        useViewStore().handleProjectUpload();
    },
    "CTRL SHIFT N": () => {
        useViewStore().setupProject();
    },
    "CTRL SHIFT S": () => {
        // downloadProject(useViewStore());
    },



};