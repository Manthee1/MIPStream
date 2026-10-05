import { ModuleManifest, PortDefinition, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import Panel from "./Panel.vue";
import { drawMuxBody } from "./draw";

export interface MuxConfig {
  bitWidth: number;
  numInputs: number;
}

export const MuxManifest: ModuleManifest<MuxConfig> = {
  typeId: "std.mux",
  label: "Multiplexer",
  description,
  icon,
  panel: Panel,
  category: "logic",
  render: drawMuxBody,

  defaultConfig: {
    bitWidth: 32,
    numInputs: 2,
  },

  configSchema: [
    {
      key: "bitWidth",
      label: "Bit Width",
      type: "number",
      min: 1,
      max: 32,
      default: 32
    },
    {
      key: "numInputs",
      label: "Number of Inputs",
      type: "number",
      min: 2,
      max: 32,
      default: 2
    }
  ],
  
  generatePorts: (config) => {
    const ports: PortDefinition[] = [];
    
    for (let i = 0; i < config.numInputs; i++) {
      ports.push({
        id: `in${i}`,
        direction: "input",
        bits: config.bitWidth,
        label: `In ${i}`,
        tooltip: `Data input ${i}`,
        position: { x: -40, y: (i - (config.numInputs - 1) / 2) * 20 }
      });
    }
    
    const selBits = Math.ceil(Math.log2(config.numInputs)) || 1;
    ports.push({
      id: "sel",
      direction: "input",
      bits: selBits,
      label: "Sel",
      tooltip: "Selection control",
      position: { x: 0, y: 40 }
    });
    
    ports.push({
      id: "out",
      direction: "output",
      bits: config.bitWidth,
      label: "Out",
      position: { x: 40, y: 0 }
    });
    
    return ports;
  },

  createEvaluators: (config): ModuleEvaluators => {
    const inputPorts: string[] = [];
    for (let i = 0; i < config.numInputs; i++) {
      inputPorts.push(`in${i}`);
    }
    inputPorts.push("sel");

    const outputPorts = ["out"];

    return {
      inputPorts,
      outputPorts,
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const selIndex = config.numInputs;
        const selValue = inputs[selIndex];
        const outputs = new Uint32Array(1);
        outputs[0] = (selValue < config.numInputs) ? inputs[selValue] : 0;
        return outputs;
      }
    };
  }
};
