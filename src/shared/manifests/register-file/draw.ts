/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { RegisterFileConfig } from "./index";
import { addBodyText, portPosition } from "../draw-helpers";
import { portAnchors } from "../../utils/port-math";

/** Vertical padding, leaving room for the title + pin labels. */
const VERTICAL_PADDING = 20;

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

  // Body edges align with the port layout so pins sit exactly on the
  // boundary: left/right on the address/data pins, bottom on the write-enable
  // pin, top padded to clear the title and the top-row labels.
  const anchors = portAnchors(options.ports);
  // Exclude the write-enable pin from the top/bottom edges so the body doesn't stretch to meet it.
  anchors.splice(anchors.findIndex((a) => a.port.id === "we"), 1);
  const xs = anchors.map((a) => a.position.x);
  const ys = anchors.map((a) => a.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys)- VERTICAL_PADDING;
  const maxY = Math.max(...ys)+ VERTICAL_PADDING;

  group.add(
    new Konva.Rect({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      cornerRadius: 0,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  addBodyText(group, minX, (maxY + minY) /2-5, options.label, options, {
    fontSize: 10,
    bold: true,
    align: "center",
    width: maxX - minX,
  });

  // Left-side pin names (read/write addresses).
  addBodyText(group, rs.x + 6, rs.y - 5, "Read reg 1", options);
  addBodyText(group, rt.x + 6, rt.y - 5, "Read reg 2", options);
  addBodyText(group, rd.x + 6, rd.y - 5, "Write reg", options);
  addBodyText(group, wd.x + 6, wd.y - 5, "Write data", options);

  // Right-side pin names (read/write data).
  addBodyText(group, readA.x - 54, readA.y - 5, "Read data 1", options, { align: "right", width: 48 });
  addBodyText(group, readB.x - 54, readB.y - 5, "Read data 2", options, { align: "right", width: 48 });

  // Write-enable pin name.
  addBodyText(group, we.x-15, we.y + 5, "Write", options, { width: 30, align: "center" });

  return { width: maxX - minX, height: maxY - minY };
}
