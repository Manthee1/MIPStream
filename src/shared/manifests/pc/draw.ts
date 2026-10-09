/** @format */

import type Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { ProgramCounterConfig } from "./index";
import type { RegisterConfig } from "../register/index";
import { drawStageRegisterBody } from "../register/draw";
import { addBodyText } from "../draw-helpers";

/**
 * The PC renders as the stage register symbol with an explicit "PC" marking
 * so it is unmistakable on the schematic.
 */
export function drawProgramCounterBody(
  group: Konva.Group,
  options: ModuleRenderOptions<ProgramCounterConfig>
): ModuleRenderOutput {
  const size = drawStageRegisterBody(group, options as ModuleRenderOptions<RegisterConfig>);
  addBodyText(group, -12, 8, "PC", options, {
    fontSize: 10,
    bold: true,
    align: "center",
    width: 24,
  });
  return size;
}
