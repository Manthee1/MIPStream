/** @format */

import { ModuleManifest, ModuleEvaluators, PortDefinition } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import ControlConfigEditor from "./ControlConfigEditor.vue";
import { drawControlBody } from "./draw";
import {
  CONTROL_ROWS,
  CONTROL_SIGNALS,
  ControlConfig,
  buildControlTable,
  opcodeMask,
} from "./logic";

export type { ControlConfig, ControlRow, ControlSignalDef } from "./logic";

export const ControlManifest: ModuleManifest<ControlConfig> = {
  typeId: "std.control",
  label: "Control Unit",
  description,
  icon,
  category: "logic",
  render: drawControlBody,

  // The signal list + opcode table form one coherent spreadsheet-style
  // editor, so it replaces the generic schema-driven form entirely.
  configEditor: ControlConfigEditor,

  defaultConfig: {
    opcodeBits: 6,
    signals: CONTROL_SIGNALS,
    rows: CONTROL_ROWS,
  },

  generatePorts: (config): PortDefinition[] => {
    const outputs: PortDefinition[] = config.signals.map((signal, index) => ({
      id: signal.id,
      direction: "output",
      bits: signal.bits,
      label: signal.label ?? signal.id,
      tooltip: `Control signal ${signal.id} (${signal.bits} bit${signal.bits > 1 ? "s" : ""})`,
      // 20-unit port pitch, matching every other multi-port manifest, so
      // signal pins land on the common whole-unit lattice.
      position: { x: 50, y: (index - (config.signals.length - 1) / 2) * 20 },
    }));
    return [
      {
        id: "opcode",
        direction: "input",
        bits: config.opcodeBits,
        label: "Opcode",
        tooltip: "Instruction opcode field",
        position: { x: -50, y: 0 },
      },
      ...outputs,
    ];
  },

  createEvaluators: (config): ModuleEvaluators => {
    // Compile the user's decode table once into a flat lookup.
    const table = buildControlTable(config);
    const signalCount = config.signals.length;
    const mask = opcodeMask(config.opcodeBits);
    return {
      inputPorts: ["opcode"],
      outputPorts: config.signals.map((signal) => signal.id),
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const base = (inputs[0] & mask) * signalCount;
        return table.slice(base, base + signalCount);
      },
    };
  },
};
