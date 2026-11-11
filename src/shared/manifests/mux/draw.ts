/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { MuxConfig } from "./index";
import { addModuleLabel, portPosition } from "../draw-helpers";

/** Fraction of the data-input span cut away on the narrow (output) side. */
const SLANT_RATIO = 0.3;

/**
 * Custom draw function for the Multiplexer: a trapezoid body whose tall left
 * edge spans the data inputs and whose narrow right edge meets the output.
 * The trapezoid is derived only from the data inputs/output so the output pin
 * sits vertically centered on the right edge; the selector pin hangs below
 * the body rather than stretching it downward.
 */
export function drawMuxBody(
  group: Konva.Group,
  options: ModuleRenderOptions<MuxConfig>
): ModuleRenderOutput {
  const dataInputs = options.ports.filter(
    (port) => port.direction === "input" && port.id !== "sel"
  );
  const inputYs = dataInputs.map((port) => portPosition(options.ports, port.id).y);
  const topY = Math.min(...inputYs) - 15;
  const botY = Math.max(...inputYs) + 15;
  const inX = portPosition(options.ports, "in0").x;
  const outPos = portPosition(options.ports, "out");
  const slant = (botY - topY) * SLANT_RATIO;

  group.add(
    new Konva.Line({
      points: [
        inX, topY,
        outPos.x, topY + slant,
        outPos.x, botY - slant,
        inX, botY,
      ],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  addModuleLabel(group, options, {
    minX: inX,
    minY: topY,
    maxX: outPos.x,
    maxY: botY,
    width: outPos.x - inX,
    height: botY - topY,
  });

  return { width: outPos.x - inX, height: botY - topY };
}
