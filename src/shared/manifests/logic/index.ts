import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import Panel from "./Panel.vue";

export type LogicOp = "and" | "or" | "xor" | "nor";

export interface LogicGateConfig {
  bitWidth: number;
  op: LogicOp;
}

export const LogicGateManifest: ModuleManifest<LogicGateConfig> = {
  typeId: "std.logic",
  label: "Logic Gate",
  description,
  icon,
  panel: Panel,
  category: "logic",

  defaultConfig: {
    bitWidth: 32,
    op: "and",
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
      key: "op",
      label: "Operation",
      type: "select",
      options: ["and", "or", "xor", "nor"],
      default: "and"
    }
  ],

  generatePorts: (config) => [
    { id: "a", direction: "input", bits: config.bitWidth, label: "A", position: { x: -40, y: -10 } },
    { id: "b", direction: "input", bits: config.bitWidth, label: "B", position: { x: -40, y: 10 } },
    { id: "out", direction: "output", bits: config.bitWidth, label: "Out", position: { x: 40, y: 0 } },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    return {
      inputPorts: ["a", "b"],
      outputPorts: ["out"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const a = inputs[0];
        const b = inputs[1];
        const outputs = new Uint32Array(1);

        switch (config.op) {
          case "and": outputs[0] = (a & b) >>> 0; break;
          case "or":  outputs[0] = (a | b) >>> 0; break;
          case "xor": outputs[0] = (a ^ b) >>> 0; break;
          case "nor": outputs[0] = (~(a | b)) >>> 0; break;
        }

        return outputs;
      },
    };
  },
};
