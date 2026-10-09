/** @format */

import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import Panel from "./Panel.vue";
import { drawDataMemoryBody } from "./draw";
import {
  createWordMemoryState,
  readWord,
  writeWord,
  type WordMemoryState,
} from "../word-memory";
import { widthMask } from "../../utils/bit-ops";

export interface DataMemoryConfig {
  wordCount: number;
  bitWidth: number;
  /** Engine-injected storage reference (see createInitialState). */
  state?: WordMemoryState;
}

export const DataMemoryManifest: ModuleManifest<DataMemoryConfig> = {
  typeId: "std.dmem",
  label: "Data Memory",
  description,
  icon,
  category: "memory",
  panel: Panel,
  render: drawDataMemoryBody,

  defaultConfig: {
    wordCount: 1024,
    bitWidth: 32,
  },

  configSchema: [
    {
      key: "wordCount",
      label: "Word Count",
      type: "number",
      min: 1,
      max: 65536,
      default: 1024,
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
      position: { x: -50, y: -25 },
    },
    {
      id: "wd",
      direction: "input",
      bits: config.bitWidth,
      label: "Write Data",
      position: { x: -50, y: 25 },
    },
    {
      id: "rdata",
      direction: "output",
      bits: config.bitWidth,
      label: "Read Data",
      position: { x: 50, y: 0 },
    },
    {
      id: "memWrite",
      direction: "input",
      bits: 1,
      label: "MemWrite",
      tooltip: "Write control",
      position: { x: -25, y: 55 },
    },
    {
      id: "memRead",
      direction: "input",
      bits: 1,
      label: "MemRead",
      tooltip: "Read control",
      position: { x: 25, y: 55 },
    },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    const state = config.state ?? createWordMemoryState(config.wordCount);
    const mask = widthMask(config.bitWidth);
    return {
      inputPorts: ["addr", "wd", "memWrite", "memRead"],
      outputPorts: ["rdata"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        // Reads settle from the values held before this evaluation; a write
        // commits while MemWrite is asserted during the engine's propagation
        // pass — exactly once per clock cycle.
        const rdata = inputs[3] & 1 ? readWord(state, inputs[0], mask) : 0;
        if (inputs[2] & 1) {
          writeWord(state, inputs[0], inputs[1], mask);
        }
        return new Uint32Array([rdata]);
      },
    };
  },
};
