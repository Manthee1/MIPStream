/** @format */

import { ModuleManifest, ModuleEvaluators, PortDefinition } from "../../types/manifest";
import { drawMuxBody, SLANT_RATIO } from "./draw";
import MuxConfigEditor from "./MuxConfigEditor.vue";
import {
  buildMuxLut,
  muxSelBits,
  muxSelCode,
  resolveMuxSelMap,
  selectMappedMuxInput,
  type MuxConfig,
} from "./logic";
import description2 from "./description-2.md?raw";
import description4 from "./description-4.md?raw";
import description8 from "./description-8.md?raw";
import description16 from "./description-16.md?raw";
import icon2 from "./icon-2.svg?raw";
import icon4 from "./icon-4.svg?raw";
import icon8 from "./icon-8.svg?raw";
import icon16 from "./icon-16.svg?raw";

export type { MuxConfig } from "./logic";

/** Shared port layout: stacked data inputs, selector on the configured vertical edge, output right. */
function muxGeneratePorts(config: MuxConfig): PortDefinition[] {
  const ports: PortDefinition[] = [];
  const selBits = muxSelBits(config.numInputs);
  const selMap = resolveMuxSelMap(config.selMap, config.numInputs);

  for (let inputIndex = 0; inputIndex < config.numInputs; inputIndex++) {
    ports.push({
      id: `in${inputIndex}`,
      direction: "input",
      bits: config.bitWidth,
      label: `In ${inputIndex}`,
      tooltip: `Data input ${inputIndex} — forwarded when Sel = ${muxSelCode(selMap[inputIndex], selBits)}`,
      position: { x: -15, y: (inputIndex - (config.numInputs - 1) / 2) * 20 },
    });
  }


  const topY = (-(config.numInputs - 1) / 2) * 20 - 15;
  const botY = ((config.numInputs - 1) / 2) * 20 + 15;
  const slant = (botY - topY) * SLANT_RATIO;
  const selSpan = config.selPosition === "top" ? topY + slant/2 :  botY - slant/2;
  
  ports.push({
    id: "sel",
    direction: "input",
    bits: selBits,
    label: "Sel",
    tooltip: "Selection control",
    position: { x: 0, y: selSpan},
  });

  ports.push({
    id: "out",
    direction: "output",
    bits: config.bitWidth,
    label: "Out",
    position: { x: 15, y: 0 },
  });

  return ports;
}

/** Shared evaluator; the selection follows the configured sel→input map. */
function muxCreateEvaluators(config: MuxConfig): ModuleEvaluators {
  const inputPorts: string[] = [];
  for (let i = 0; i < config.numInputs; i++) {
    inputPorts.push(`in${i}`);
  }
  inputPorts.push("sel");

  const lut = buildMuxLut(resolveMuxSelMap(config.selMap, config.numInputs));
  return {
    inputPorts,
    outputPorts: ["out"],
    evaluate: (inputs: Uint32Array): Uint32Array =>
      new Uint32Array([selectMappedMuxInput(inputs, inputs[config.numInputs], lut)]),
  };
}

interface MuxVariantSpec {
  typeId: string;
  label: string;
  numInputs: number;
  description: string;
  icon: string;
}

/**
 * Builds a drop-in mux variant manifest. All variants share the trapezoid
 * draw function, port layout, and evaluator; only the identity, fixed
 * `numInputs`, and description differ.
 */
function makeMuxManifest(spec: MuxVariantSpec): ModuleManifest<MuxConfig> {
  return {
    typeId: spec.typeId,
    label: spec.label,
    description: spec.description,
    icon: spec.icon,
    category: "logic",
    render: drawMuxBody,

    // The bit width, selector position, sel→input assignment and input
    // stacking form one coherent editor (the control-unit pattern), so it
    // replaces the generic schema-driven form entirely.
    configEditor: MuxConfigEditor,

    defaultConfig: {
      bitWidth: 32,
      numInputs: spec.numInputs,
    },

    generatePorts: muxGeneratePorts,
    createEvaluators: muxCreateEvaluators,
  };
}

export const Mux2Manifest = makeMuxManifest({
  typeId: "std.mux2",
  label: "Mux 2:1",
  numInputs: 2,
  description: description2,
  icon: icon2,
});

export const Mux4Manifest = makeMuxManifest({
  typeId: "std.mux4",
  label: "Mux 4:1",
  numInputs: 4,
  description: description4,
  icon: icon4,
});

export const Mux8Manifest = makeMuxManifest({
  typeId: "std.mux8",
  label: "Mux 8:1",
  numInputs: 8,
  description: description8,
  icon: icon8,
});

export const Mux16Manifest = makeMuxManifest({
  typeId: "std.mux16",
  label: "Mux 16:1",
  numInputs: 16,
  description: description16,
  icon: icon16,
});
