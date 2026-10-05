/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, ModuleRenderOutput } from "@/shared/types/manifest";
import { portAnchors, portBounds } from "@/shared/utils/port-math";

const BODY_PADDING = 20;
const LABEL_HEIGHT = 14;
const BODY_STROKE_WIDTH = 1.5;

/**
 * Fallback body renderer for manifests that do not define a custom `render`.
 * Derives a sharp-cornered rectangle (jagged aesthetic: cornerRadius 0) from
 * the port extremes and draws the module label centered above the body.
 */
export function drawDefaultBody(
  group: Konva.Group,
  options: ModuleRenderOptions
): ModuleRenderOutput {
  const anchors = portAnchors(options.ports);
  const bounds = portBounds(anchors, BODY_PADDING);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  group.add(
    new Konva.Rect({
      x: bounds.minX,
      y: bounds.minY,
      width,
      height,
      cornerRadius: 0,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: BODY_STROKE_WIDTH,
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
