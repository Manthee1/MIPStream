/** @format */

import {
  loadProgram,
  pauseProgram,
  restartProgram,
  startProgram,
  stepProgram,
} from "../composables/useSimulation";
import { useUIStore } from "../stores/UIStore";
import { useProjectStore } from "../stores/projectStore";
import router from "../router";

/**
 * Global app-level shortcuts. Canvas-scoped bindings live in the
 * SchematicDesigner's ShortcutManager instead.
 */
export const keyboardShortcuts: Record<
  string,
  { action: () => void; label: string; description: string }
> = {};

/** Wraps a simulation action so it only fires in the Simulate perspective. */
function simulateOnly(action: () => boolean | void): () => void {
  return () => {
    if (useUIStore().perspective !== "simulate") return;
    action();
  };
}

/** True when the workspace is open with a loaded project. */
function workspaceWithProject(): boolean {
  return (
    router.currentRoute.value.path.startsWith("/workspace") &&
    !!useProjectStore().currentProject
  );
}

keyboardShortcuts["F4"] = {
  action: () => {
    if (!workspaceWithProject()) return;
    const uiStore = useUIStore();
    uiStore.perspective = uiStore.perspective === "design" ? "simulate" : "design";
  },
  label: "Toggle Design / Simulate",
  description: "Switches between the architecture designer and the simulator perspectives.",
};

keyboardShortcuts["F5"] = {
  action: simulateOnly(startProgram),
  label: "Start / Resume Simulation",
  description: "Loads the program (when needed) and starts continuous clock execution.",
};

keyboardShortcuts["F6"] = {
  action: simulateOnly(pauseProgram),
  label: "Pause Simulation",
  description: "Pauses continuous execution at the current cycle.",
};

keyboardShortcuts["F7"] = {
  action: simulateOnly(loadProgram),
  label: "Assemble and Load",
  description: "Assembles the mapped editors and loads the program, paused at instruction 0.",
};

keyboardShortcuts["F9"] = {
  action: simulateOnly(restartProgram),
  label: "Restart Program",
  description: "Rewinds to the loaded state (re-assembling when the source changed).",
};

keyboardShortcuts["F10"] = {
  action: simulateOnly(stepProgram),
  label: "Step Simulation",
  description: "Executes a single clock cycle while paused.",
};

