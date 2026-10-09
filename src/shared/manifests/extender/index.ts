/** @format */

import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { drawExtenderBody } from "./draw";
import { widthMask } from "../../utils/bit-ops";

export interface ExtenderConfig {
  inputBits: number;
  outputBits: number;
  isSigned: boolean;
}

export const ExtenderManifest: ModuleManifest<ExtenderConfig> = {
  typeId: "std.extender",
  label: "Bit Extender",
  description,
  icon,
  category: "logic",
  render: drawExtenderBody,

  defaultConfig: {
    inputBits: 16,
    outputBits: 32,
    isSigned: true,
  },

  configSchema: [
    {
      key: "inputBits",
      label: "Input Bits",
      type: "number",
      min: 1,
      max: 32,
      default: 16
    },
    {
      key: "outputBits",
      label: "Output Bits",
      type: "number",
      min: 1,
      max: 32,
      default: 32
    },
    {
      key: "isSigned",
      label: "Sign Extend",
      type: "boolean",
      default: true,
      tooltip: "If true, performs sign extension. If false, performs zero extension."
    }
  ],

  generatePorts: (config) => [
    { id: "in", direction: "input", bits: config.inputBits, label: "In", position: { x: -48, y: 0 } },
    { id: "out", direction: "output", bits: config.outputBits, label: "Out", position: { x: 48, y: 0 } },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    const hiMask = widthMask(config.outputBits);
    const loMask = widthMask(config.inputBits);
    return {
      inputPorts: ["in"],
      outputPorts: ["out"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const value = (inputs[0] >>> 0) & loMask;
        let out = value;
        if (config.isSigned) {
          const signBit = (value >>> (config.inputBits - 1)) & 1;
          if (signBit) {
            // Fill bits [inputBits, outputBits) with ones.
            out = (value | (hiMask & ~loMask)) >>> 0;
          }
        }
        return new Uint32Array([(out & hiMask) >>> 0]);
      },
    };
  },
};
