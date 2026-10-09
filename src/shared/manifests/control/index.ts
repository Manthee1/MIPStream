/** @format */

import { ModuleManifest, ModuleEvaluators, PortDefinition } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { decodeControl } from "./logic";

export interface ControlConfig {}

export const ControlManifest: ModuleManifest<ControlConfig> = {
  typeId: "std.control",
  label: "Control Unit",
  description,
  icon,
  category: "logic",

  defaultConfig: {},

  generatePorts: (): PortDefinition[] => [
    { id: "opcode", direction: "input", bits: 6, label: "Opcode", tooltip: "Instruction opcode field", position: { x: -50, y: 0 } },
    { id: "regDst", direction: "output", bits: 1, label: "RegDst", position: { x: 50, y: -63 } },
    { id: "aluSrc", direction: "output", bits: 1, label: "ALUSrc", position: { x: 50, y: -45 } },
    { id: "memToReg", direction: "output", bits: 1, label: "MemtoReg", position: { x: 50, y: -27 } },
    { id: "regWrite", direction: "output", bits: 1, label: "RegWrite", position: { x: 50, y: -9 } },
    { id: "memRead", direction: "output", bits: 1, label: "MemRead", position: { x: 50, y: 9 } },
    { id: "memWrite", direction: "output", bits: 1, label: "MemWrite", position: { x: 50, y: 27 } },
    { id: "branch", direction: "output", bits: 1, label: "Branch", position: { x: 50, y: 45 } },
    { id: "aluOp", direction: "output", bits: 2, label: "ALUOp", position: { x: 50, y: 63 } },
  ],

  createEvaluators: (): ModuleEvaluators => {
    return {
      inputPorts: ["opcode"],
      outputPorts: [
        "regDst",
        "aluSrc",
        "memToReg",
        "regWrite",
        "memRead",
        "memWrite",
        "branch",
        "aluOp",
      ],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const signals = decodeControl(inputs[0]);
        return new Uint32Array([
          signals.regDst,
          signals.aluSrc,
          signals.memToReg,
          signals.regWrite,
          signals.memRead,
          signals.memWrite,
          signals.branch,
          signals.aluOp,
        ]);
      },
    };
  },
};
