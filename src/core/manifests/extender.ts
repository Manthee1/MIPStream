import { ModuleManifest, PortDefinition, ModuleEvaluators } from "@/types/manifest";

export interface ExtenderConfig {
  inputBits: number;
  outputBits: number;
  isSigned: boolean;
}

export const ExtenderManifest: ModuleManifest<ExtenderConfig> = {
  typeId: "std.extender",
  defaultConfig: {
    inputBits: 16,
    outputBits: 32,
    isSigned: true,
  },

  generatePorts: (config) => [
    { id: "in", direction: "input", bits: config.inputBits, label: "In" },
    { id: "out", direction: "output", bits: config.outputBits, label: "Out" },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    return {
      inputPorts: ["in"],
      outputPorts: ["out"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const val = inputs[0];
        const outputs = new Uint32Array(1);
        
        if (config.isSigned) {
          // Check the sign bit of the input
          const signBit = (val >> (config.inputBits - 1)) & 1;
          if (signBit) {
            // Create a mask for the upper bits
            // e.g., if inputBits is 16, mask is 0xFFFF0000
            const mask = ((1 << (config.outputBits - config.inputBits)) - 1) << config.inputBits;
            outputs[0] = (val | mask) >>> 0;
          } else {
            // Just the value
            const mask = (1 << config.inputBits) - 1;
            outputs[0] = (val & mask) >>> 0;
          }
        } else {
          // Zero extension
          const mask = (1 << config.inputBits) - 1;
          outputs[0] = (val & mask) >>> 0;
        }

        return outputs;
      },
    };
  },
};
