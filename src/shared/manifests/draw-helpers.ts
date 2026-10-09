/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, Pos, PortDefinition } from "../types/manifest";
import { portAnchors, portBounds, type Bounds } from "../utils/port-math";

const LABEL_HEIGHT = 14;
const BODY_STROKE_WIDTH = 1.5;
const MEMORY_FOLD = 12;

/** Looks up a port's module-local position by id (falls back to the origin). */
export function portPosition(ports: PortDefinition[], id: string): Pos {
  const anchor = portAnchors(ports).find((entry) => entry.port.id === id);
  return anchor ? anchor.position : { x: 0, y: 0 };
}

/** Draws the module label centered above the given body bounds. */
export function addModuleLabel(
  group: Konva.Group,
  options: ModuleRenderOptions,
  bounds: Bounds
): void {
  group.add(
    new Konva.Text({
      x: bounds.minX,
      y: bounds.minY - LABEL_HEIGHT - 2,
      width: bounds.width,
      text: options.label,
      fontSize: 11,
      fontStyle: "bold",
      align: "center",
      fill: options.theme.text,
      listening: false,
    })
  );
}

export interface BodyTextSettings {
  fontSize?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  width?: number;
}

/** Small text pinned inside the module body (pin names, widths, markers). */
export function addBodyText(
  group: Konva.Group,
  x: number,
  y: number,
  text: string,
  options: ModuleRenderOptions,
  settings: BodyTextSettings = {}
): void {
  const { fontSize = 8, bold = false, align = "left", width = 48 } = settings;
  group.add(
    new Konva.Text({
      x,
      y,
      width,
      text,
      fontSize,
      fontStyle: bold ? "bold" : "normal",
      align,
      fill: options.theme.text,
      listening: false,
    })
  );
}

/**
 * Classic memory symbol: a sharp rectangle with a folded top-right corner.
 * Returns the body bounds so callers can annotate pins.
 */
export function addFoldedMemoryBody(
  group: Konva.Group,
  options: ModuleRenderOptions
): Bounds {
  const bounds = portBounds(portAnchors(options.ports), 20);

  group.add(
    new Konva.Line({
      points: [
        bounds.minX, bounds.minY,
        bounds.maxX - MEMORY_FOLD, bounds.minY,
        bounds.maxX, bounds.minY + MEMORY_FOLD,
        bounds.maxX, bounds.maxY,
        bounds.minX, bounds.maxY,
      ],
      closed: true,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: BODY_STROKE_WIDTH,
      name: "module-body",
    })
  );

  // Fold flap detail line.
  group.add(
    new Konva.Line({
      points: [
        bounds.maxX - MEMORY_FOLD, bounds.minY,
        bounds.maxX - MEMORY_FOLD, bounds.minY + MEMORY_FOLD,
      ],
      stroke: options.theme.bodyStroke,
      strokeWidth: 1,
      listening: false,
    })
  );

  return bounds;
}

/** Plain sharp rectangle body derived from the port layout. */
export function addRectBody(
  group: Konva.Group,
  options: ModuleRenderOptions,
  padding = 20
): Bounds {
  const bounds = portBounds(portAnchors(options.ports), padding);
  group.add(
    new Konva.Rect({
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.width,
      height: bounds.height,
      cornerRadius: 0,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: BODY_STROKE_WIDTH,
      name: "module-body",
    })
  );
  return bounds;
}
