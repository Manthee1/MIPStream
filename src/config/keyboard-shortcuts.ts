import { downloadProject } from './../utils/projectActions';
import { useProjectStore } from "../stores/projectStore";
import { useSimulationStore } from "../stores/simulationStore";
import { useUIStore } from "../stores/UIStore";
import { defaultLayoutGridConfig } from "./layout";
import { notify } from '@kyvg/vue3-notification';

export const keyboardShortcuts: Record<string, { action: () => void; label: string; description: string }> = {};

keyboardShortcuts["F5"] = {
    action: () => useSimulationStore().run(),
    label: "Run Simulation",
    description: "Starts the simulation process."
};

keyboardShortcuts["SHIFT F5"] = {
    action: () => useSimulationStore().stop(),
    label: "Stop Simulation",
    description: "Stops the currently running simulation."
};

keyboardShortcuts["F6"] = {
    action: () => useSimulationStore().loadProgram(),
    label: "Reset Simulation",
    description: "Resets the simulation to its initial state."
};

keyboardShortcuts["F8"] = {
    action: () => {
        if (useSimulationStore().status === 'paused') {
            useSimulationStore().resume();
            return;
        }
        useSimulationStore().pause();
    },
    label: "Pause/Resume Simulation",
    description: "Pauses the simulation if running, or resumes it if paused."
};

keyboardShortcuts["F9"] = {
    action: () => useSimulationStore().step(),
    label: "Step Simulation",
    description: "Executes a single step in the simulation."
};

keyboardShortcuts["CTRL ="] = {
    action: () => {
        if (useSimulationStore().speed >= 100) return;
        useSimulationStore().setSpeed(useSimulationStore().speed + 1);
    },
    label: "Increase Simulation Speed",
    description: "Increases the speed of the simulation."
};
keyboardShortcuts["CTRL +"] = keyboardShortcuts["CTRL ="];

keyboardShortcuts["CTRL -"] = {
    action: () => {
        if (useSimulationStore().speed <= 1) return;
        useSimulationStore().setSpeed(useSimulationStore().speed - 1);
    },
    label: "Decrease Simulation Speed",
    description: "Decreases the speed of the simulation."
};

keyboardShortcuts["CTRL O"] = {
    action: () => useProjectStore().invokeProjectUpload(),
    label: "Open Project",
    description: "Opens the project upload dialog."
};

keyboardShortcuts["CTRL SHIFT N"] = {
    action: () => useProjectStore().invokeProjectSetup(),
    label: "New Project",
    description: "Opens the project setup dialog to create a new project."
};

keyboardShortcuts["CTRL S"] = {
    action: () => useProjectStore().saveProject(),
    label: "Save Project",
    description: "Saves the current project."
};

keyboardShortcuts["CTRL SHIFT S"] = {
    action: () => {
        const currentProject = useProjectStore().currentProject;
        if (!currentProject) {
            notify({
                title: "No project to download",
                text: "Please create or open a project before downloading.",
                type: "error",
                duration: 3000,
            });
            return;
        }
        downloadProject(currentProject);
    },
    label: "Download Project",
    description: "Downloads the current project to your local machine."
};

keyboardShortcuts["CTRL SHIFT L"] = {
    action: async () => {
        // Reset layout
        await useProjectStore().updateProjectLayout(defaultLayoutGridConfig);
        window.location.reload();
    },
    label: "Reset Layout",
    description: "Resets the project layout to the default configuration and reloads the page."
};

keyboardShortcuts["CTRL ,"] = {
    action: () => {
        useUIStore().openGeneralSettings();
    },
    label: "Open General Settings",
    description: "Opens general settings."
};

keyboardShortcuts["CTRL ALT ,"] = {
    action: () => {
        useUIStore().openProjectSettings();
    },
    label: "Open Project Settings",
    description: "Opens project settings."
};

keyboardShortcuts["CTRL H"] = {
    action: () => {
        useUIStore().openHelp();
    },
    label: "Open Help",
    description: "Opens the help dialog."
};



keyboardShortcuts["ESCAPE"] = {
    action: () => {
        console.log("ESC pressed");

        (document.querySelector('.modal .modal-content .close-button') as HTMLButtonElement)?.click();

        if (useUIStore().showSettings) {
            useUIStore().closeSettings();
        }
        if (useUIStore().showHelp) {
            useUIStore().closeHelp();
        }
    },
    label: "Close Settings/Help",
    description: "Closes the settings or help dialog if open."
};