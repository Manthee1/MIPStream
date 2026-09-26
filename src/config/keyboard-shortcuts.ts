import { useSimulationStore } from "../stores/simulationStore";

export const keyboardShortcuts: Record<string, { action: () => void; label: string; description: string }> = {};

keyboardShortcuts["F5"] = {
    action: () => useSimulationStore().run(),
    label: "Run Simulation",
    description: "Starts the simulation process."
};
