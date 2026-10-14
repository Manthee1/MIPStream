/** @format */

import { pause, run, step } from "../composables/useSimulation";
import { useUIStore } from "../stores/UIStore";

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

keyboardShortcuts["F5"] = {
  action: simulateOnly(run),
  label: "Run Simulation",
  description: "Starts or resumes continuous clock execution.",
};

keyboardShortcuts["F6"] = {
  action: simulateOnly(pause),
  label: "Pause Simulation",
  description: "Pauses continuous execution at the current cycle.",
};

keyboardShortcuts["F10"] = {
  action: simulateOnly(step),
  label: "Step Simulation",
  description: "Executes a single clock cycle while paused.",
};

