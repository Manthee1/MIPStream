/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { ShifterConfig } from "./index";
import { addBodyText, addModuleLabel, addRectBody } from "../draw-helpers";

/** Shift box: chevrons mark the shift direction, "A" marks arithmetic shifts. */
export function drawShifterBody(
  group: Konva.Group,
  options: ModuleRenderOptions<ShifterConfig>
): ModuleRenderOutput {
  const bounds = addRectBody(group, options);
  addModuleLabel(group, options, bounds);

  // Chevron pairs pointing in the shift direction.
  const pointingLeft = options.config.mode === "logical_left";
  for (const cx of [-5, 5]) {
    group.add(
      new Konva.Line({
        points: pointingLeft
          ? [cx + 7, -7, cx, 0, cx + 7, 7]
          : [cx - 7, -7, cx, 0, cx - 7, 7],
        stroke: options.theme.text,
        strokeWidth: 1.5,
        lineJoin: "miter",
        listening: false,
      })
    );
  }

  if (options.config.mode === "arithmetic_right") {
    addBodyText(group, 12, -5, "A", options, { fontSize: 9, bold: true, width: 10 });
  }

  return { width: bounds.width, height: bounds.height };
}
