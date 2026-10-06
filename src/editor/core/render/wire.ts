/** @format */

import Konva from "konva";
import { readRenderTheme } from "./theme";

const WIRE_STROKE_WIDTH = 2;
const WIRE_SELECTED_WIDTH = 3;
const WIRE_HIT_STROKE_WIDTH = 12;

/** Creates a committed wire polyline for the logic layer. */
export function createWireNode(netId: string, points: number[]): Konva.Line {
  const theme = readRenderTheme();

  const line = new Konva.Line({
    points,
    stroke: theme.accent,
    strokeWidth: WIRE_STROKE_WIDTH,
    lineCap: "square",
    lineJoin: "miter",
    hitStrokeWidth: WIRE_HIT_STROKE_WIDTH,
    name: "wire-node",
  });

  line.setAttr("netId", netId);
  return line;
}

/** Creates a dashed, non-interactive routing preview line. */
export function createPreviewWire(): Konva.Line {
  const theme = readRenderTheme();

  return new Konva.Line({
    points: [],
    stroke: theme.accent,
    strokeWidth: WIRE_STROKE_WIDTH,
    dash: [4, 4],
    opacity: 0.7,
    listening: false,
    name: "wire-preview",
  });
}

/** Recomputes the wire points in place (drag re-routing) without re-creating. */
export function updateWireNode(line: Konva.Line, points: number[]): void {
  line.points(points);
}

/** Toggles the selection highlight on a wire. */
export function setWireSelected(line: Konva.Line, selected: boolean): void {
  const theme = readRenderTheme();
  line.stroke(selected ? theme.selected : theme.accent);
  line.strokeWidth(selected ? WIRE_SELECTED_WIDTH : WIRE_STROKE_WIDTH);
}
