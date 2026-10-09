/** @format */

import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { drawConstantBody } from "./draw";
import { fitWidth } from "../../utils/bit-ops";

export interface ConstantConfig {
  value: number;
  bitWidth: number;
}

export const ConstantManifest: ModuleManifest<ConstantConfig> = {
  typeId: "std.constant",
  label: "Constant",
  description,
  icon,
  category: "iO",
  render: drawConstantBody,

  defaultConfig: {
    value: 4,
    bitWidth: 32,
  },

  configSchema: [
    {
      key: "value",
      label: "Value",
      type: "number",
      min: 0,
      max: 4294967295,
      step: 1,
      default: 4,
      tooltip: "Hardwired output value.",
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

  generatePorts: (config) => [
    { id: "out", direction: "output", bits: config.bitWidth, label: "Out", position: { x: 40, y: 0 } },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    return {
      inputPorts: [],
      outputPorts: ["out"],
      evaluate: (): Uint32Array => new Uint32Array([fitWidth(config.value, config.bitWidth)]),
    };
  },
};
