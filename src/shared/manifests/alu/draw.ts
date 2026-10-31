/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { AluConfig } from "./index";
import { addBodyText, portPosition } from "../draw-helpers";

/**
 * Arrow silhouette geometry: the vertical back edge at `left` carries the A
 * and B operands (separated by the classic notch), and the top and bottom
 * edges converge to a blunt arrow tip at `tipX` where the Result exits.
 * `generatePorts` consumes these constants so pins sit exactly on the
 * silhouette edges.
 */
export const ALU_GEOMETRY = {
  left: -52,
  top: -30,
  bottom: 42,
  tipX: 54,
  tipHalf: 6,
  notchX: -38,
  notchY: 8,
} as const;

/** Y coordinate on the sloped top edge at the given x. */
export function aluTopEdgeY(x: number): number {
  const { left, top, tipX, tipHalf } = ALU_GEOMETRY;
  const t = (x - left) / (tipX - left);
  return top + (-tipHalf - top) * t;
}

/** Y coordinate on the sloped bottom edge at the given x. */
export function aluBottomEdgeY(x: number): number {
  const { left, bottom, tipX, tipHalf } = ALU_GEOMETRY;
  const t = (x - left) / (tipX - left);
  return bottom + (tipHalf - bottom) * t;
}

export function drawAluBody(
  group: Konva.Group,
  options: ModuleRenderOptions<AluConfig>
): ModuleRenderOutput {
  const a = portPosition(options.ports, "a");
  const b = portPosition(options.ports, "b");
  const op = portPosition(options.ports, "op");
  const zero = portPosition(options.ports, "zero");
  const { left, top, bottom, tipX, tipHalf, notchX, notchY } = ALU_GEOMETRY;

  group.add(
    new Konva.Line({
      points: [
        left, top,
        tipX, -tipHalf,
        tipX, tipHalf,
        left, bottom,
        left, b.y + 7,
        notchX, notchY,
        left, a.y - 7,
      ],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  // Operand markers just inside the notched back edge.
  addBodyText(group, a.x + 10, a.y - 5, "A", options, { width: 12 });
  addBodyText(group, b.x + 10, b.y - 5, "B", options, { width: 12 });
  // Control pin names above the sloped bottom edge.
  addBodyText(group, op.x - 8, op.y - 12, "Op", options, { width: 16 });
  addBodyText(group, zero.x - 14, zero.y - 12, "Zero", options, { width: 24 });
  addBodyText(group, -14, -10, "ALU", options, {
    fontSize: 13,
    bold: true,
    align: "center",
    width: 28,
  });

  return { width: tipX - left, height: bottom - top };
}
