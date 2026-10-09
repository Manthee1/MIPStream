/** @format */

import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { decodeAluControl } from "./logic";

export interface AluControlConfig {}

export const AluControlManifest: ModuleManifest<AluControlConfig> = {
  typeId: "std.alu-control",
  label: "ALU Control",
  description,
  icon,
  category: "logic",

  defaultConfig: {},

  generatePorts: () => [
    { id: "aluop", direction: "input", bits: 2, label: "ALUOp", tooltip: "Operation class from the main control unit", position: { x: -40, y: -10 } },
    { id: "funct", direction: "input", bits: 6, label: "Funct", tooltip: "Function code field of the instruction", position: { x: -40, y: 10 } },
    { id: "operation", direction: "output", bits: 4, label: "Op", tooltip: "4-bit ALU operation", position: { x: 40, y: 0 } },
  ],

  createEvaluators: (): ModuleEvaluators => {
    return {
      inputPorts: ["aluop", "funct"],
      outputPorts: ["operation"],
      evaluate: (inputs: Uint32Array): Uint32Array =>
        new Uint32Array([decodeAluControl(inputs[0], inputs[1])]),
    };
  },
};
