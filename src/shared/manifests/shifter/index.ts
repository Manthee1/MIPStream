import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import Panel from "./Panel.vue";

export type ShifterMode = "logical_left" | "logical_right" | "arithmetic_right";

export interface ShifterConfig {
  bitWidth: number;
  mode: ShifterMode;
  shamt: number;
}

export const ShifterManifest: ModuleManifest<ShifterConfig> = {
  typeId: "std.shifter",
  label: "Shifter",
  description,
  icon,
  panel: Panel,
  category: "logic",

  defaultConfig: {
    bitWidth: 32,
    mode: "logical_left",
    shamt: 0,
  },

  configSchema: [
    {
      key: "bitWidth",
      label: "Bit Width",
      type: "number",
      min: 1,
      max: 32,
      default: 32
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: ["logical_left", "logical_right", "arithmetic_right"],
      default: "logical_left"
    },
    {
      key: "shamt",
      label: "Shift Amount",
      type: "number",
      min: 0,
      max: 31,
      default: 0
    }
  ],

  generatePorts: (config) => [
    { id: "in", direction: "input", bits: config.bitWidth, label: "In", position: { x: -40, y: 0 } },
    { id: "out", direction: "output", bits: config.bitWidth, label: "Out", position: { x: 40, y: 0 } },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    return {
      inputPorts: ["in"],
      outputPorts: ["out"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const value = inputs[0];
        const shamt = config.shamt & 0x1F; // Max 31 for 32-bit
        const outputs = new Uint32Array(1);

        switch (config.mode) {
          case "logical_left":
            outputs[0] = (value << shamt) >>> 0;
            break;
          case "logical_right":
            outputs[0] = (value >>> shamt) >>> 0;
            break;
          case "arithmetic_right":
            outputs[0] = (value >> shamt) >>> 0;
            break;
          default:
            outputs[0] = value >>> 0;
        }

        return outputs;
      },
    };
  },
};
