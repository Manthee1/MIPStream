/** @format */

import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import Panel from "./Panel.vue";
import { drawInstructionMemoryBody } from "./draw";
import { createWordMemoryState, readWord, type WordMemoryState } from "../word-memory";
import { widthMask } from "../../utils/bit-ops";

export interface InstructionMemoryConfig {
  wordCount: number;
  bitWidth: number;
  /** Engine-injected storage reference (see createInitialState). */
  state?: WordMemoryState;
}

export const InstructionMemoryManifest: ModuleManifest<InstructionMemoryConfig> = {
  typeId: "std.imem",
  label: "Instruction Memory",
  description,
  icon,
  category: "memory",
  panel: Panel,
  render: drawInstructionMemoryBody,

  defaultConfig: {
    wordCount: 256,
    bitWidth: 32,
  },

  configSchema: [
    {
      key: "wordCount",
      label: "Word Count",
      type: "number",
      min: 1,
      max: 65536,
      default: 256,
      tooltip: "Number of addressable 32-bit words.",
    },
    {
      key: "bitWidth",
      label: "Bit Width",
      type: "number",
      min: 1,
      max: 32,
      default: 32,
    },
  ],

  createInitialState: (config): WordMemoryState =>
    createWordMemoryState(config.wordCount),

  generatePorts: (config) => [
    {
      id: "addr",
      direction: "input",
      bits: 32,
      label: "Address",
      tooltip: "Byte address (word-aligned)",
      position: { x: -50, y: 0 },
    },
    {
      id: "instruction",
      direction: "output",
      bits: config.bitWidth,
      label: "Instruction",
      position: { x: 50, y: 0 },
    },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    const state = config.state ?? createWordMemoryState(config.wordCount);
    const mask = widthMask(config.bitWidth);
    return {
      inputPorts: ["addr"],
      outputPorts: ["instruction"],
      // Combinational ROM read — the program is written by the assembler
      // mapping and the simulator panel, never during evaluation.
      evaluate: (inputs: Uint32Array): Uint32Array =>
        new Uint32Array([readWord(state, inputs[0], mask)]),
    };
  },
};
