/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { AdderConfig } from "./index";
import { addBodyText, addModuleLabel, portPosition } from "../draw-helpers";

/**
 * Arrow silhouette geometry (matching the ALU): the vertical back edge at
 * `back` carries the A and B operands, and the top and bottom edges converge
 * to a blunt arrow tip at `tipX` where the Sum exits. `generatePorts`
 * consumes these constants so pins sit exactly on the silhouette edges.
 */
export const ADDER_GEOMETRY = {
  back: -45,
  top: -30,
  bottom: 30,
  tipX: 45,
  tipHalf: 6,
} as const;

/** Y coordinate on the sloped top edge at the given x. */
export function adderTopEdgeY(x: number): number {
  const { back, top, tipX, tipHalf } = ADDER_GEOMETRY;
  const t = (x - back) / (tipX - back);
  return top + (-tipHalf - top) * t;
}

/** Y coordinate on the sloped bottom edge at the given x. */
export function adderBottomEdgeY(x: number): number {
  const { back, bottom, tipX, tipHalf } = ADDER_GEOMETRY;
  const t = (x - back) / (tipX - back);
  return bottom + (tipHalf - bottom) * t;
}

export function drawAdderBody(
  group: Konva.Group,
  options: ModuleRenderOptions<AdderConfig>
): ModuleRenderOutput {
  const a = portPosition(options.ports, "a");
  const b = portPosition(options.ports, "b");
  const cin = portPosition(options.ports, "cin");
  const cout = portPosition(options.ports, "cout");
  const { back, top, bottom, tipX, tipHalf } = ADDER_GEOMETRY;

  group.add(
    new Konva.Line({
      points: [
        back, top,
        tipX, -tipHalf,
        tipX, tipHalf,
        back, bottom,
      ],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  addModuleLabel(group, options, {
    minX: back,
    minY: top,
    maxX: tipX,
    maxY: bottom,
    width: tipX - back,
    height: bottom - top,
  });

  // Classic arithmetic "+" markers at the operand pins and the bold core.
  addBodyText(group, a.x + 10, a.y - 7, "+", options, { fontSize: 10, bold: true, width: 10 });
  addBodyText(group, b.x + 10, b.y - 4, "+", options, { fontSize: 10, bold: true, width: 10 });
  addBodyText(group, -9, -12, "+", options, {
    fontSize: 20,
    bold: true,
    align: "center",
    width: 18,
  });
  // Carry pin names inside the sloped edges.
  addBodyText(group, cin.x - 30, cin.y + 4, "Cin", options, { width: 22 });
  addBodyText(group, cout.x - 34, cout.y - 12, "Cout", options, { width: 26 });

  return { width: tipX - back, height: bottom - top };
}
