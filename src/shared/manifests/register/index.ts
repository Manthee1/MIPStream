/** @format */

import { ModuleManifest } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { drawStageRegisterBody } from "./draw";
import { createRegisterEvaluators, generateRegisterPorts } from "./logic";
import type { RegisterConfig, RegisterPin } from "./logic";
import RegisterConfigEditor from "./RegisterConfigEditor.vue";

export type { RegisterConfig, RegisterPin } from "./logic";

export const StageRegisterManifest: ModuleManifest<RegisterConfig> = {
  typeId: "std.register",
  label: "Stage Register",
  description,
  icon,
  category: "memory",
  render: drawStageRegisterBody,

  // The pin list + reset toggle form one coherent editor (the control-unit
  // pattern), so it replaces the generic schema-driven form entirely.
  configEditor: RegisterConfigEditor,

  defaultConfig: {
    bitWidth: 32,
  },

  // Ports and evaluators live in `logic.ts` (pure, headless-checkable):
  // absent `pins` yields the legacy single `d`/`q` shape at `bitWidth`.
  generatePorts: generateRegisterPorts,

  createEvaluators: createRegisterEvaluators,
};
