import { useProgramExecutionStore } from "../stores/programExecutionStore";

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


};