/** @format */

import type Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { InstructionMemoryConfig } from "./index";
import {
  addBodyText,
  addFoldedMemoryBody,
  addModuleLabel,
  portPosition,
} from "../draw-helpers";

/** Folded-corner memory block with classic Address/Instruction pin names. */
export function drawInstructionMemoryBody(
  group: Konva.Group,
  options: ModuleRenderOptions<InstructionMemoryConfig>
): ModuleRenderOutput {
  const addr = portPosition(options.ports, "addr");
  const instruction = portPosition(options.ports, "instruction");
  const bounds = addFoldedMemoryBody(group, options);
  addModuleLabel(group, options, bounds);

  addBodyText(group, addr.x + 8, addr.y - 5, "Address", options);
  addBodyText(group, instruction.x - 56, instruction.y - 5, "Instruction", options, {
    align: "right",
    width: 48,
  });

  return { width: bounds.width, height: bounds.height };
}
