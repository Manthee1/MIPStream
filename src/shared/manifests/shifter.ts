import { ModuleManifest, PortDefinition, ModuleEvaluators } from "../types/manifest";

export type ShifterMode = "logical_left" | "logical_right" | "arithmetic_right";

export interface ShifterConfig {
  bitWidth: number;
  mode: ShifterMode;
  shamt: number;
}

export const ShifterManifest: ModuleManifest<ShifterConfig> = {
  typeId: "std.shifter",
  defaultConfig: {
    bitWidth: 32,
    mode: "logical_left",
    shamt: 0,
  },

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
            outputs[0] = value << shamt;
            break;
          case "logical_right":
            outputs[0] = value >>> shamt;
            break;
          case "arithmetic_right":
            outputs[0] = value >> shamt;
            break;
          default:
            outputs[0] = value;
        }

        return outputs;
      },
    };
  },
};
