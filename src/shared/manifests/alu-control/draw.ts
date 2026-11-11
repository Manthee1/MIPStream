/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { AluControlConfig } from "./index";
import { addBodyText, addModuleLabel, portPosition } from "../draw-helpers";
import { portAnchors } from "../../utils/port-math";

/**
 * ALU Control symbol: a square block. The ALUOp/Funct inputs enter on the
 * left edge and the 4-bit operation leaves on the right; the square side is
 * the larger of the port span's width and height.
 */
export function drawAluControlBody(
  group: Konva.Group,
  options: ModuleRenderOptions<AluControlConfig>
): ModuleRenderOutput {
  const anchors = portAnchors(options.ports);
  const xs = anchors.map((a) => a.position.x);
  const ys = anchors.map((a) => a.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const side = Math.max(maxX - minX, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const left = centerX - side / 2;
  const top = centerY - side / 2;

  group.add(
    new Konva.Rect({
      x: left,
      y: top,
      width: side,
      height: side,
      cornerRadius: 0,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );  
  

  addModuleLabel(group, options, {
    minX: left,
    minY: top,
    maxX: left + side,
    maxY: top + side,
    width: side,
    height: side,
  });

  const aluop = portPosition(options.ports, "aluop");
  const funct = portPosition(options.ports, "funct");
  const operation = portPosition(options.ports, "operation");
  addBodyText(group, aluop.x + 8, aluop.y - 5, "ALUOp", options, { width: 30 });
  addBodyText(group, funct.x + 8, funct.y - 5, "Funct", options, { width: 30 });
  addBodyText(group, operation.x - 18, operation.y - 5, "Op", options, {
    align: "right",
    width: 14,
  });

  return { width: side, height: side };
}
