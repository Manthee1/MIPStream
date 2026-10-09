/** @format */

import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { drawProgramCounterBody } from "./draw";
import { registerTransfer } from "../register/logic.ts";

/**
 * The PC is a stage register with a fixed, non-configurable 32-bit width so
 * the simulator can identify program-counter semantics purely by typeId.
 */
export interface ProgramCounterConfig {
  /** Fixed at 32 — intentionally not user-configurable. */
  bitWidth: number;
}

export const ProgramCounterManifest: ModuleManifest<ProgramCounterConfig> = {
  typeId: "std.pc",
  label: "Program Counter",
  description,
  icon,
  category: "memory",
  render: drawProgramCounterBody,

  defaultConfig: {
    bitWidth: 32,
  },

  // No configSchema: restricted configuration (fixed 32-bit width) so the
  // simulator knows exactly what the program counter is without guessing.

  generatePorts: (config) => [
    { id: "d", direction: "input", bits: config.bitWidth, label: "D", tooltip: "Next instruction address", position: { x: -40, y: 0 } },
    { id: "q", direction: "output", bits: config.bitWidth, label: "PC", tooltip: "Current instruction address", position: { x: 40, y: 0 } },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    return {
      inputPorts: ["d"],
      outputPorts: ["q"],
      clockEdge: "rising",
      evaluate: (inputs: Uint32Array): Uint32Array =>
        new Uint32Array([registerTransfer(inputs[0], config.bitWidth)]),
    };
  },
};
