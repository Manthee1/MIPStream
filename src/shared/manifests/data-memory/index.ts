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
      position: { x: -50, y: -15 },
    },
    {
      id: "wd",
      direction: "input",
      bits: config.bitWidth,
      label: "Write Data",
      position: { x: -50, y: 40 },
    },
    {
      id: "rdata",
      direction: "output",
      bits: config.bitWidth,
      label: "Read Data",
      position: { x: 50, y: 40 },
    },
    {
      id: "memWrite",
      direction: "input",
      bits: 1,
      label: "MemWrite",
      tooltip: "Write control",
      position: { x: -25, y: -40 },
    },
    {
      id: "memRead",
      direction: "input",
      bits: 1,
      label: "MemRead",
      tooltip: "Read control",
      position: { x: 25, y: -40 },
    },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    const state = config.state ?? createWordMemoryState(config.wordCount);
    const mask = widthMask(config.bitWidth);
    return {
      // Asynchronous read — combinational, gated by MemRead. `addr` is
      // shared with the clocked write commit below (one address input
      // feeding both evaluators).
      inputPorts: ["addr", "memRead"],
      outputPorts: ["rdata"],
      evaluate: (inputs: Uint32Array): Uint32Array =>
        new Uint32Array([inputs[1] & 1 ? readWord(state, inputs[0], mask) : 0]),
      // Synchronous write — commits at the rising clock edge, exactly like
      // real hardware data memory. `addr`/`wd`/`memWrite` are edge-sampled;
      // a value written at edge k is readable in the pass of cycle k.
      clocked: {
        inputPorts: ["addr", "wd", "memWrite"],
        clockEdge: "rising",
        commit: (inputs: Uint32Array): void => {
          if (inputs[2] & 1) {
            writeWord(state, inputs[0], inputs[1], mask);
          }
        },
      },
    };
  },
};
