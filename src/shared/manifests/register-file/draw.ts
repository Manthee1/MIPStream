/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { RegisterFileConfig } from "./index";
import { addBodyText, portPosition } from "../draw-helpers";

const MIN_X = -110;
const MAX_X = 110;
const MIN_Y = -70;
const MAX_Y = 80;

/**
 * Register File symbol: a wide storage block annotated with the classic
 * two-read-port / one-write-port pin names.
 */
export function drawRegisterFileBody(
  group: Konva.Group,
  options: ModuleRenderOptions<RegisterFileConfig>
): ModuleRenderOutput {
  const rs = portPosition(options.ports, "rs");
  const rt = portPosition(options.ports, "rt");
  const rd = portPosition(options.ports, "rd");
  const readA = portPosition(options.ports, "readA");
  const readB = portPosition(options.ports, "readB");
  const wd = portPosition(options.ports, "wd");
  const we = portPosition(options.ports, "we");

  group.add(
    new Konva.Rect({
      x: MIN_X,
      y: MIN_Y,
      width: MAX_X - MIN_X,
      height: MAX_Y - MIN_Y,
      cornerRadius: 0,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  addBodyText(group, MIN_X, MIN_Y + 8, options.label, options, {
    fontSize: 10,
    bold: true,
    align: "center",
    width: MAX_X - MIN_X,
  });

  // Left-side pin names (read/write addresses).
  addBodyText(group, rs.x + 6, rs.y - 5, "Read reg 1", options);
  addBodyText(group, rt.x + 6, rt.y - 5, "Read reg 2", options);
  addBodyText(group, rd.x + 6, rd.y - 5, "Write reg", options);

  // Right-side pin names (read/write data).
  addBodyText(group, readA.x - 54, readA.y - 5, "Read data 1", options, { align: "right", width: 48 });
  addBodyText(group, readB.x - 54, readB.y - 5, "Read data 2", options, { align: "right", width: 48 });
  addBodyText(group, wd.x - 54, wd.y - 5, "Write data", options, { align: "right", width: 48 });

  // Write-enable pin name above the bottom pin.
  addBodyText(group, we.x + 8, we.y - 14, "Write", options, { width: 30 });

  return { width: MAX_X - MIN_X, height: MAX_Y - MIN_Y };
}
