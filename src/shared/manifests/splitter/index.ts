/** @format */

import { ModuleManifest, ModuleEvaluators, PortDefinition } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { drawSplitterBody } from "./draw";
import SplitterConfigEditor from "./SplitterConfigEditor.vue";
import { resolveSplitterFields, type SplitterConfig } from "./logic";
import { clampWiringBits, contiguousField, fieldMappingTooltip, remapFromBus } from "../wiring-logic";
import { widthMask } from "../../utils/bit-ops";

export const BitSplitterManifest: ModuleManifest<SplitterConfig> = {
  typeId: "std.splitter",
  label: "Bit Splitter",
  description,
  icon,
  category: "wiring",
  render: drawSplitterBody,
  configEditor: SplitterConfigEditor,

  defaultConfig: {
    inputBits: 32,
    outputs: [contiguousField(31, 16, "f1"), contiguousField(15, 0, "f2")],
  },

  generatePorts: (config) => {
    const busBits = clampWiringBits(config.inputBits);
    const fields = resolveSplitterFields(config);

    const ports: PortDefinition[] = [
      {
        id: "in",
        direction: "input",
        bits: busBits,
        label: "In",
        tooltip: `Input bus [${busBits - 1}:0]`,
        position: { x: -45, y: 0 },
      },
    ];

    const PORT_SPACING = 15;

    const isEvenPortCount = fields.length % 2 === 0;
    let basePortOffset = (PORT_SPACING * (fields.length - 1)) / 2;

    fields.forEach((field, i) => {
      let currentPortOffset = i * PORT_SPACING - basePortOffset;
      if(isEvenPortCount)
        currentPortOffset += (i < fields.length/2 ? -1: 1) * PORT_SPACING/5;
      
      

      ports.push({
        id: `out_${field.id}`,
        direction: "output",
        bits: field.bits,
        label: field.label || `Out ${i + 1}`,
        tooltip: fieldMappingTooltip(field),
        position: { x: 45, y: currentPortOffset },
      });

    });

    return ports;
  },

  createEvaluators: (config): ModuleEvaluators => {
    const busBits = clampWiringBits(config.inputBits);
    const fields = resolveSplitterFields(config);
    const mask = widthMask(busBits);

    return {
      inputPorts: ["in"],
      outputPorts: fields.map((field) => `out_${field.id}`),
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const bus = (inputs[0] >>> 0) & mask;
        const out = new Uint32Array(fields.length);
        for (let i = 0; i < fields.length; i++) out[i] = remapFromBus(bus, fields[i]);
        return out;
      },
    };
  },
};
