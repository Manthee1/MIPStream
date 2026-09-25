import { ModuleManifest, PortDefinition, ModuleEvaluators } from "../types/manifest";

export type LogicOp = "and" | "or" | "xor" | "nor";

export interface LogicGateConfig {
  bitWidth: number;
  op: LogicOp;
}

export const LogicGateManifest: ModuleManifest<LogicGateConfig> = {
  typeId: "std.logic",
  defaultConfig: {
    bitWidth: 32,
    op: "and",
  },

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
          case "and": outputs[0] = a & b; break;
          case "or":  outputs[0] = a | b; break;
          case "xor": outputs[0] = a ^ b; break;
          case "nor": outputs[0] = ~(a | b); break;
        }

        return outputs;
      },
    };
  },
};
