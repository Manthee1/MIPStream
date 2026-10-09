/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { ConstantConfig } from "./index";
import { addBodyText, addModuleLabel } from "../draw-helpers";

/** Small source box printing the hardwired value on the symbol. */
export function drawConstantBody(
  group: Konva.Group,
  options: ModuleRenderOptions<ConstantConfig>
): ModuleRenderOutput {
  group.add(
    new Konva.Rect({
      x: -40,
      y: -20,
      width: 80,
      height: 40,
      cornerRadius: 0,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  addModuleLabel(group, options, { minX: -40, minY: -20, maxX: 40, maxY: 20, width: 80, height: 40 });
  addBodyText(group, -40, -7, String(options.config.value >>> 0), options, {
    fontSize: 12,
    bold: true,
    align: "center",
    width: 80,
  });

  return { width: 80, height: 40 };
}
