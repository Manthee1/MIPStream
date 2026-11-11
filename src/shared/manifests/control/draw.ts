/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { ControlConfig } from "./index";
import { addBodyText, addModuleLabel, portPosition } from "../draw-helpers";
import { portAnchors } from "../../utils/port-math";

/** Vertical margin around the top/bottom signal pins. */
const VERTICAL_PADDING = 12;
/** Corner radius for the control unit's rounded silhouette. */
const CORNER_RADIUS = 8;

/**
 * Control Unit symbol: a tall, thin rounded block. The opcode enters on the
 * left edge and the signal outputs leave on the right edge, so the body's
 * width is exactly the port span (thinner than the generic padded rectangle).
 */
export function drawControlBody(
  group: Konva.Group,
  options: ModuleRenderOptions<ControlConfig>
): ModuleRenderOutput {
  const anchors = portAnchors(options.ports);
  const xs = anchors.map((a) => a.position.x);
  const ys = anchors.map((a) => a.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys) - VERTICAL_PADDING;
  const maxY = Math.max(...ys) + VERTICAL_PADDING;

  group.add(
    new Konva.Rect({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      cornerRadius: CORNER_RADIUS,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  addModuleLabel(group, options, {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  });


    // Add all output port labels 
  options.ports.forEach((port) => {
    if (port.direction === "output") {
      const pos = portPosition(options.ports, port.id);
      addBodyText(group, pos.x - 46, pos.y - 6, port.label ?? port.id, options, {
        width: 40,
        align: "right",
      });
    }
  });


  const opcode = portPosition(options.ports, "opcode");
  // addBodyText(group, opcode.x + 8, opcode.y - 5, "Opcode", options, { width: 36 });

  // Central CU label
  // addBodyText(group, minX, (minY + maxY) / 2, "CU", options, {
  //   align: "center",
  //   width: maxX - minX,
  // });


  return { width: maxX - minX, height: maxY - minY };
}
