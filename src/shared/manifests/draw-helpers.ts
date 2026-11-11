/** @format */

import Konva from "konva";
import type { ModuleRenderOptions, Pos, PortDefinition } from "../types/manifest";
import { portAnchors, type Bounds } from "../utils/port-math";

const LABEL_HEIGHT = 14;
const BODY_STROKE_WIDTH = 1.5;
const MEMORY_FOLD = 12;
/** Minimum body height so single-row modules never collapse to a flat line. */
const BODY_MIN_HEIGHT = 40;
/** Vertical margin so pin rows don't touch the body's top/bottom edges. */
const BODY_VERTICAL_PADDING = 10;

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
 * Horizontal edges are derived from the port layout so pins sit exactly on
 * the left/right edges; the vertical extent is caller-supplied so each
 * memory can size itself (taller instruction memory, etc.). Returns the body
 * bounds so callers can annotate pins.
 */
export function addFoldedMemoryBody(
  group: Konva.Group,
  options: ModuleRenderOptions,
  minY: number,
  maxY: number
): Bounds {
  const anchors = portAnchors(options.ports);
  const xs = anchors.map((a) => a.position.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  group.add(
    new Konva.Line({
      points: [
        minX, minY,
        maxX - MEMORY_FOLD, minY,
        maxX, minY + MEMORY_FOLD,
        maxX, maxY,
        minX, maxY,
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
        maxX - MEMORY_FOLD, minY,
        maxX - MEMORY_FOLD, minY + MEMORY_FOLD,
      ],
      stroke: options.theme.bodyStroke,
      strokeWidth: 1,
      listening: false,
    })
  );

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Plain sharp rectangle body. Horizontal edges coincide with the left/right
 * port x positions so pins sit exactly on the edge; vertical extent wraps
 * the pin rows with a small margin and a minimum height for single-row
 * modules.
 */
export function addRectBody(
  group: Konva.Group,
  options: ModuleRenderOptions,
  minHeight = BODY_MIN_HEIGHT
): Bounds {
  const anchors = portAnchors(options.ports);

  // Port-less module (e.g. an emptied stage register): a fixed default body,
  // so the min/max folds below never see an empty list.
  if (anchors.length === 0) {
    group.add(
      new Konva.Rect({
        x: -40,
        y: -20,
        width: 80,
        height: 40,
        cornerRadius: 0,
        fill: options.theme.bodyFill,
        stroke: options.theme.bodyStroke,
        strokeWidth: BODY_STROKE_WIDTH,
        name: "module-body",
      })
    );
    return { minX: -40, minY: -20, maxX: 40, maxY: 20, width: 80, height: 40 };
  }

  const xs = anchors.map((a) => a.position.x);
  const ys = anchors.map((a) => a.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const rawMinY = Math.min(...ys);
  const rawMaxY = Math.max(...ys);
  const height = Math.max(rawMaxY - rawMinY + BODY_VERTICAL_PADDING * 2, minHeight);
  const centerY = (rawMinY + rawMaxY) / 2;
  const minY = centerY - height / 2;
  const maxY = centerY + height / 2;

  group.add(
    new Konva.Rect({
      x: minX,
      y: minY,
      width: maxX - minX,
      height,
      cornerRadius: 0,
      fill: options.theme.bodyFill,
      stroke: options.theme.bodyStroke,
      strokeWidth: BODY_STROKE_WIDTH,
      name: "module-body",
    })
  );
  return { minX, minY, maxX, maxY, width: maxX - minX, height };
}
