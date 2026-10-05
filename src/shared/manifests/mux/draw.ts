/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "../../types/manifest";
import type { MuxConfig } from "./index";
import { portAnchors, portBounds } from "../../utils/port-math";

const BODY_PADDING = 20;
const LABEL_HEIGHT = 14;
/** Fraction of the body height cut away on the narrow (output) side. */
const SLANT_RATIO = 0.3;

/**
 * Custom draw function for the Multiplexer: a trapezoid body whose tall left
 * edge spans the data inputs and whose narrow right edge meets the output.
 * All dimensions derive from the port layout, so resizing `numInputs`
 * automatically rescales the body.
 */
export function drawMuxBody(
  group: Konva.Group,
  options: ModuleRenderOptions<MuxConfig>
): ModuleRenderOutput {
  const anchors = portAnchors(options.ports);
  const bounds = portBounds(anchors, BODY_PADDING);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const slant = height * SLANT_RATIO;

  group.add(
    new Konva.Line({
      points: [
        bounds.minX, bounds.minY,
        bounds.maxX, bounds.minY + slant,
        bounds.maxX, bounds.maxY - slant,
        bounds.minX, bounds.maxY,
      ],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: 1.5,
      name: "module-body",
    })
  );

  group.add(
    new Konva.Text({
      x: bounds.minX,
      y: bounds.minY - LABEL_HEIGHT - 2,
      width,
      text: options.label,
      fontSize: 11,
      fontStyle: "bold",
      align: "center",
      fill: options.theme.text,
      listening: false,
    })
  );

  return { width, height };
}
