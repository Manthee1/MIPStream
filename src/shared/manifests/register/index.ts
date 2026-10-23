/** @format */

import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { drawStageRegisterBody } from "./draw";
import { registerTransfer } from "./logic";

export interface RegisterConfig {
  bitWidth: number;
  /**
   * Stage boundary identity for settings-managed pipeline registers.
   * `managed` marks the register as owned by the Architecture Settings
   * (non-removable, auto-created); `stageId` is its display label ("IF/ID").
   */
  managed?: true;
  stageIndex?: number;
  stageId?: string;
}

export const StageRegisterManifest: ModuleManifest<RegisterConfig> = {
  typeId: "std.register",
  label: "Stage Register",
  description,
  icon,
  category: "memory",
  render: drawStageRegisterBody,

  defaultConfig: {
    bitWidth: 32,
  },

  configSchema: [
    {
      key: "bitWidth",
      label: "Bit Width",
      type: "number",
      min: 1,
      max: 64,
      default: 32,
      tooltip: "Width of the registered word.",
    },
  ],

  generatePorts: (config) => [
    { id: "d", direction: "input", bits: config.bitWidth, label: "D", tooltip: "Data input", position: { x: -40, y: 0 } },
    { id: "q", direction: "output", bits: config.bitWidth, label: "Q", tooltip: "Stored output", position: { x: 40, y: 0 } },
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
