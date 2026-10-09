/** @format */

import { ModuleManifest, ModuleEvaluators, PortDefinition } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { drawSplitterBody } from "./draw";
import { fieldRanges, parseFieldSpec, splitFields } from "./logic";

export interface SplitterConfig {
  /** Width of the input bus. */
  inputBits: number;
  /** Comma-separated field widths, MSB-first (e.g. "6,5,5,5,5,6"). */
  fields: string;
}

/**
 * Resolves the field widths from the config spec, falling back to a single
 * full-width pass-through field when the spec is invalid.
 */
function resolveFieldWidths(config: SplitterConfig): number[] {
  return parseFieldSpec(config.fields, config.inputBits) ?? [config.inputBits];
}

export const BitSplitterManifest: ModuleManifest<SplitterConfig> = {
  typeId: "std.splitter",
  label: "Bit Splitter",
  description,
  icon,
  category: "logic",
  render: drawSplitterBody,

  defaultConfig: {
    inputBits: 32,
    fields: "16,16",
  },

  configSchema: [
    {
      key: "inputBits",
      label: "Input Bits",
      type: "number",
      min: 1,
      max: 32,
      default: 32,
      tooltip: "Width of the input bus.",
    },
    {
      key: "fields",
      label: "Field Widths",
      type: "string",
      default: "16,16",
      tooltip: "Comma-separated field widths, MSB first (e.g. 6,5,5,5,5,6). Fields summing to less than the input drop the remaining low bits.",
    },
  ],

  generatePorts: (config) => {
    const widths = resolveFieldWidths(config);
    const ranges = fieldRanges(widths, config.inputBits);

    const ports: PortDefinition[] = [
      {
        id: "in",
        direction: "input",
        bits: config.inputBits,
        label: "In",
        position: { x: -50, y: 0 },
      },
    ];

    widths.forEach((width, i) => {
      ports.push({
        id: `out${i}`,
        direction: "output",
        bits: width,
        label: `Out ${i}`,
        tooltip: `Bits [${ranges[i].hi}:${ranges[i].lo}]`,
        position: { x: 50, y: (i - (widths.length - 1) / 2) * 20 },
      });
    });

    return ports;
  },

  createEvaluators: (config): ModuleEvaluators => {
    const widths = resolveFieldWidths(config);
    return {
      inputPorts: ["in"],
      outputPorts: widths.map((_, i) => `out${i}`),
      evaluate: (inputs: Uint32Array): Uint32Array =>
        new Uint32Array(splitFields(inputs[0], widths, config.inputBits)),
    };
  },
};
