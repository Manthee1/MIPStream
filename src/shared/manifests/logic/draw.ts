/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { LogicGateConfig } from "./logic";
import { addModuleLabel } from "../draw-helpers";

const TOP = -24;
const BOTTOM = 24;
const LEFT = -48;

/**
 * IEEE-style gate symbols: flat-back AND (D shape), curved-back OR/XOR
 * (XOR gains the double back arc), NOR with an inversion bubble on the
 * output. Input/output pins sit exactly on the symbol edges.
 */
export function drawLogicGateBody(
  group: Konva.Group,
  options: ModuleRenderOptions<LogicGateConfig>
): ModuleRenderOutput {
  const { config, theme } = options;

  let data: string;
  switch (config.op) {
    case "and":
      // D shape: flat back, semicircular face reaching the output pin.
      data = "M -48 -24 L 20 -24 A 24 24 0 0 1 20 24 L -48 24 Z";
      break;
    case "or":
    case "xor":
      // Concave back, curved face reaching the output pin.
      data = "M -48 -24 Q -36 0 -48 24 L -28 24 C 6 24 44 12 44 0 C 44 -12 6 -24 -28 -24 Z";
      break;
    case "nor":
      // OR face pulled in to leave room for the inversion bubble.
      data = "M -48 -24 Q -36 0 -48 24 L -28 24 C 2 24 36 12 36 0 C 36 -12 2 -24 -28 -24 Z";
      break;
  }

  group.add(
    new Konva.Path({
      data,
      fill: theme.bodyFill,
      stroke: theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  if (config.op === "xor") {
    // Double back arc marks the exclusive variant.
    group.add(
      new Konva.Path({
        data: "M -56 -24 Q -44 0 -56 24",
        fillEnabled: false,
        stroke: theme.bodyStroke,
        strokeWidth: 1.5,
        listening: false,
      })
    );
  }

  if (config.op === "nor") {
    // Inversion bubble touching the output pin.
    group.add(
      new Konva.Circle({
        x: 41,
        y: 0,
        radius: 5,
        fill: theme.bodyFill,
        stroke: theme.bodyStroke,
        strokeWidth: 1.5,
        listening: false,
      })
    );
  }

  const minX = config.op === "xor" ? -56 : LEFT;
  const maxX = config.op === "nor" ? 46 : 44;

  addModuleLabel(group, options, {
    minX,
    minY: TOP,
    maxX,
    maxY: BOTTOM,
    width: maxX - minX,
    height: BOTTOM - TOP,
  });

  return { width: maxX - minX, height: BOTTOM - TOP };
}
