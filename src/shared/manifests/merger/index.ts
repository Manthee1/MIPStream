/** @format */

import { ModuleManifest, ModuleEvaluators, PortDefinition } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { drawMergerBody } from "./draw";
import MergerConfigEditor from "./MergerConfigEditor.vue";
import { resolveMergerFields, type MergerConfig } from "./logic";
import {
  clampWiringBits,
  fieldMappingTooltip,
  passThroughField,
  remapToBus,
} from "../wiring-logic";
import { widthMask } from "../../utils/bit-ops";

export const BitMergerManifest: ModuleManifest<MergerConfig> = {
  typeId: "std.merger",
  label: "Bit Merger",
  description,
  icon,
  category: "wiring",
  render: drawMergerBody,
  configEditor: MergerConfigEditor,

  defaultConfig: {
    outputBits: 32,
    inputs: [passThroughField(32)],
  },

  generatePorts: (config) => {
    const busBits = clampWiringBits(config.outputBits);
    const fields = resolveMergerFields(config);

    const ports: PortDefinition[] = [];

    fields.forEach((field, i) => {
      ports.push({
        id: `in_${field.id}`,
        direction: "input",
        bits: field.bits,
        label: field.label || `In ${i + 1}`,
        tooltip: fieldMappingTooltip(field),
        position: { x: -44, y: (i - (fields.length - 1) / 2) * 20 },
      });
    });

    ports.push({
      id: "out",
      direction: "output",
      bits: busBits,
      label: "Out",
      tooltip: `Output bus [${busBits - 1}:0]`,
      position: { x: 44, y: 0 },
    });

    return ports;
  },

  createEvaluators: (config): ModuleEvaluators => {
    const busBits = clampWiringBits(config.outputBits);
    const fields = resolveMergerFields(config);
    const mask = widthMask(busBits);

    return {
      inputPorts: fields.map((field) => `in_${field.id}`),
      outputPorts: ["out"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        let acc = 0;
        for (let i = 0; i < fields.length; i++) {
          acc = remapToBus(inputs[i] >>> 0, fields[i], acc);
        }
        return new Uint32Array([(acc & mask) >>> 0]);
      },
    };
  },
};