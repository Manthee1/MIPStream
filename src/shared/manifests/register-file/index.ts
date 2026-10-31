/** @format */

import { ModuleManifest, ModuleEvaluators, PortDefinition } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import Panel from "./Panel.vue";
import { drawRegisterFileBody } from "./draw";
import {
  createRegisterFileState,
  readRegister,
  writeRegister,
  type RegisterFileState,
} from "./logic";
import { widthMask } from "../../utils/bit-ops";

export interface RegisterFileConfig {
  registerCount: number;
  bitWidth: number;
  /**
   * Engine-injected reference to this instance's register storage (created
   * via `createInitialState`). Lazily self-initializes when absent so
   * editor-side hydration stays safe.
   */
  state?: RegisterFileState;
}

export const RegisterFileManifest: ModuleManifest<RegisterFileConfig> = {
  typeId: "std.regfile",
  label: "Register File",
  description,
  icon,
  category: "memory",
  panel: Panel,
  render: drawRegisterFileBody,

  defaultConfig: {
    registerCount: 32,
    bitWidth: 32,
  },

  configSchema: [
    {
      key: "registerCount",
      label: "Register Count",
      type: "number",
      min: 2,
      max: 64,
      default: 32,
      tooltip: "Number of addressable registers ($zero is always register 0).",
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

  createInitialState: (config): RegisterFileState =>
    createRegisterFileState(config.registerCount),

  generatePorts: (config): PortDefinition[] => {
    const addressBits = Math.max(1, Math.ceil(Math.log2(config.registerCount)));
    return [
      { id: "rs", direction: "input", bits: addressBits, label: "Read Reg 1", tooltip: "First read address ($rs)", position: { x: -50, y: -50 } },
      { id: "rt", direction: "input", bits: addressBits, label: "Read Reg 2", tooltip: "Second read address ($rt)", position: { x: -50, y: -30 } },
      { id: "rd", direction: "input", bits: addressBits, label: "Write Reg", tooltip: "Write address ($rd)", position: { x: -50, y: 30 } },
      { id: "wd", direction: "input", bits: config.bitWidth, label: "Write Data", position: { x: 50, y: 30 } },
      { id: "we", direction: "input", bits: 1, label: "Write Enable", tooltip: "RegWrite control", position: { x: 0, y: 60 } },
      { id: "readA", direction: "output", bits: config.bitWidth, label: "Read Data 1", position: { x: 50, y: -50 } },
      { id: "readB", direction: "output", bits: config.bitWidth, label: "Read Data 2", position: { x: 50, y: -30 } },
    ];
  },

  createEvaluators: (config): ModuleEvaluators => {
    const state = config.state ?? createRegisterFileState(config.registerCount);
    const mask = widthMask(config.bitWidth);
    return {
      // Asynchronous read ports — combinational, so the register file's read
      // outputs participate in the datapath's propagation pass.
      inputPorts: ["rs", "rt"],
      outputPorts: ["readA", "readB"],
      evaluate: (inputs: Uint32Array): Uint32Array =>
        new Uint32Array([
          readRegister(state, inputs[0], mask),
          readRegister(state, inputs[1], mask),
        ]),
      // Synchronous write port — commits at the rising clock edge, exactly
      // like a real hardware register file. The write inputs are
      // edge-sampled, so the classic single-cycle writeback path
      // (regfile → ALU → writeback mux → regfile.wd) is a clock boundary,
      // not a combinational loop; a value written at edge k is readable in
      // the propagation pass of cycle k.
      clocked: {
        inputPorts: ["rd", "wd", "we"],
        clockEdge: "rising",
        commit: (inputs: Uint32Array): void => {
          if (inputs[2] & 1) {
            writeRegister(state, inputs[0], inputs[1], mask);
          }
        },
      },
    };
  },
};
