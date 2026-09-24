import { ModuleManifest, PortDefinition, ModuleEvaluators } from "@/types/manifest";

export interface AdderConfig {
  bitWidth: number;
}

export const AdderManifest: ModuleManifest<AdderConfig> = {
  typeId: "std.adder",
  defaultConfig: {
    bitWidth: 32,
  },

  generatePorts: (config) => [
    { id: "a", direction: "input", bits: config.bitWidth, label: "A" },
    { id: "b", direction: "input", bits: config.bitWidth, label: "B" },
    { id: "cin", direction: "input", bits: 1, label: "Cin", tooltip: "Carry In" },
    { id: "sum", direction: "output", bits: config.bitWidth, label: "Sum" },
    { id: "cout", direction: "output", bits: 1, label: "Cout", tooltip: "Carry Out" },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    return {
      inputPorts: ["a", "b", "cin"],
      outputPorts: ["sum", "cout"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const a = inputs[0];
        const b = inputs[1];
        const cin = inputs[2] & 1;

        // Use a double-precision float for the addition to catch the carry bit
        const fullSum = a + b + cin;
        
        const outputs = new Uint32Array(2);
        // sum is truncated to 32 bits by Uint32Array assignment if needed, 
        // but we handle bitWidth explicitly for safety if we wanted to mask.
        // For standard 32-bit adder:
        outputs[0] = fullSum >>> 0; 
        outputs[1] = fullSum > 0xFFFFFFFF ? 1 : 0;

        return outputs;
      },
    };
  },
};
