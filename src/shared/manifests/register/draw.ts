/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { RegisterConfig } from "./index";
import { addBodyText, addModuleLabel, addRectBody, portPosition } from "../draw-helpers";

/**
 * D-type register symbol: a sharp rectangle with the classic edge-trigger
 * triangle on the clocked side. The held value is the output net, owned by
 * the engine.
 */
export function drawStageRegisterBody(
  group: Konva.Group,
  options: ModuleRenderOptions<RegisterConfig>
): ModuleRenderOutput {
  const d = portPosition(options.ports, "d");
  const q = portPosition(options.ports, "q");
  const bounds = addRectBody(group, options);
  addModuleLabel(group, options, bounds);

  // Edge-trigger marker: triangle pointing into the body from the data edge.
  group.add(
    new Konva.Line({
      points: [bounds.minX + 3, -6, bounds.minX + 11, 0, bounds.minX + 3, 6],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.2,
      listening: false,
    })
  );

  addBodyText(group, d.x + 8, -5, "D", options, { width: 12 });
  addBodyText(group, q.x - 20, -5, "Q", options, { align: "right", width: 12 });

  return { width: bounds.width, height: bounds.height };
}
