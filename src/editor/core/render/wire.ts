/** @format */

import Konva from "konva";
import type { Pos } from "@/shared/types/manifest";
import { readRenderTheme } from "./theme";

const WIRE_STROKE_WIDTH = 2;
const WIRE_SELECTED_WIDTH = 3;
const WIRE_HIT_STROKE_WIDTH = 12;
const JUNCTION_RADIUS = 3.5;
const WAYPOINT_HANDLE_SIZE = 8;

/** Geometry of one fan-out branch: its polyline plus its trunk junction. */
export interface BranchGeometry {
  points: number[];
  junction: Pos;
}

/**
 * Creates a committed wire as a Konva.Group: the trunk line, one line per
 * fan-out branch, and a junction dot where each branch taps the trunk.
 * Selection, hover, and hit-testing operate at group level (`name:
 * "wire-group"`, `netId` attribute).
 */
export function createWireNode(
  netId: string,
  trunkPoints: number[],
  branches: BranchGeometry[]
): Konva.Group {
  const theme = readRenderTheme();

  const group = new Konva.Group({ name: "wire-group" });
  group.setAttr("netId", netId);

  const trunk = new Konva.Line({
    points: trunkPoints,
    stroke: theme.accent,
    strokeWidth: WIRE_STROKE_WIDTH,
    lineCap: "square",
    lineJoin: "miter",
    hitStrokeWidth: WIRE_HIT_STROKE_WIDTH,
    name: "wire-trunk",
  });
  group.add(trunk);

  branches.forEach((branch, index) => {
    group.add(createBranchLine(index, branch.points, theme.accent));
    group.add(
      createJunctionDot(index, branch.junction, theme.accent, theme.bodyStroke)
    );
  });

  return group;
}

/** Creates one fan-out branch line, tagged with its branch index. */
function createBranchLine(
  index: number,
  points: number[],
  accent: string
): Konva.Line {
  const line = new Konva.Line({
    points,
    stroke: accent,
    strokeWidth: WIRE_STROKE_WIDTH,
    lineCap: "square",
    lineJoin: "miter",
    hitStrokeWidth: WIRE_HIT_STROKE_WIDTH,
    name: "wire-branch",
  });
  line.setAttr("branchIndex", index);
  return line;
}

/** Creates one junction dot, tagged with its branch index. */
function createJunctionDot(
  index: number,
  junction: Pos,
  accent: string,
  bodyStroke: string
): Konva.Circle {
  const dot = new Konva.Circle({
    x: junction.x,
    y: junction.y,
    radius: JUNCTION_RADIUS,
    fill: accent,
    stroke: bodyStroke,
    strokeWidth: 1,
    name: "junction-dot",
    listening: false,
  });
  dot.setAttr("branchIndex", index);
  return dot;
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

/** Iterates every polyline (trunk + branches) of a wire group. */
export function wireGroupLines(group: Konva.Group): Konva.Line[] {
  return group.getChildren(
    (child) =>
      child.name() === "wire-trunk" || child.name() === "wire-branch"
  ) as unknown as Konva.Line[];
}

/**
 * Reconciles a wire group's polylines to the requested geometry in place
 * (drags, waypoint edits, target additions/removals) without re-creating the
 * node. Existing branches update in place, missing ones (e.g. the first
 * junction tap on a previously plain net) are created, and surplus ones are
 * destroyed. Branch children are matched via `branchIndex`.
 */
export function updateWireNode(
  group: Konva.Group,
  trunkPoints: number[],
  branches: BranchGeometry[]
): void {
  const theme = readRenderTheme();

  const trunk = group.findOne(".wire-trunk");
  if (trunk instanceof Konva.Line) trunk.points(trunkPoints);

  const liveIndices = new Set<number>();
  branches.forEach((branch, index) => {
    liveIndices.add(index);

    const line = branchChild(group, "wire-branch", index);
    if (line instanceof Konva.Line) {
      line.points(branch.points);
    } else {
      group.add(createBranchLine(index, branch.points, theme.accent));
    }

    const dot = branchChild(group, "junction-dot", index);
    if (dot) {
      dot.position(branch.junction);
    } else {
      group.add(
        createJunctionDot(index, branch.junction, theme.accent, theme.bodyStroke)
      );
    }
  });

  // Destroy branch children whose index vanished (e.g. a target was deleted).
  for (const raw of Array.from(group.getChildren())) {
    const child: Konva.Node = raw;
    if (child.name() !== "wire-branch" && child.name() !== "junction-dot") continue;
    const index: unknown = child.getAttr("branchIndex");
    if (typeof index === "number" && !liveIndices.has(index)) child.destroy();
  }
}

/** Finds the branch child (line or dot) tagged with the given index. */
function branchChild(group: Konva.Group, name: string, index: number): Konva.Node | undefined {
  return group.getChildren(
    (child) => child.name() === name && child.getAttr("branchIndex") === index
  )[0];
}

/** Toggles the selection highlight on every polyline of a wire group. */
export function setWireSelected(group: Konva.Group, selected: boolean): void {
  const theme = readRenderTheme();
  const color = selected ? theme.selected : theme.accent;
  const width = selected ? WIRE_SELECTED_WIDTH : WIRE_STROKE_WIDTH;

  for (const line of wireGroupLines(group)) {
    line.stroke(color);
    line.strokeWidth(width);
  }

  for (const dot of group.getChildren(
    (child) => child.name() === "junction-dot"
  )) {
    if (dot instanceof Konva.Circle) dot.fill(color);
  }
}

/** Hover feedback: thickens the wire for easier targeting with the mouse. */
export function setWireHover(group: Konva.Group, hovered: boolean): void {
  for (const line of wireGroupLines(group)) {
    line.strokeWidth(hovered ? WIRE_SELECTED_WIDTH : WIRE_STROKE_WIDTH);
  }
}

/**
 * Highlights a wire as a connectable target during routing: green when its
 * width matches the route start, yellow when the connection would commit a
 * bit-width mismatch. `false` restores the default accent stroke.
 */
export function setWireValidHighlight(
  group: Konva.Group,
  mode: "valid" | "warning" | false
): void {
  const theme = readRenderTheme();
  const active = mode !== false;
  const color = !active ? theme.accent : mode === "warning" ? theme.warning : theme.valid;
  for (const line of wireGroupLines(group)) {
    line.stroke(color);
    line.strokeWidth(active ? WIRE_SELECTED_WIDTH : WIRE_STROKE_WIDTH);
  }
}

/** Delete-tool hover feedback. */
export function setWireDangerHover(group: Konva.Group, danger: boolean): void {
  const theme = readRenderTheme();
  for (const line of wireGroupLines(group)) {
    line.stroke(danger ? theme.danger : theme.accent);
  }
}

const WIRE_SIGNAL_ON_WIDTH = 2.5;

/**
 * Applies the live runtime signal style during simulation: non-zero nets
 * render in the "signal on" color with a heavier stroke, zero nets render
 * dimmed (UI_AND_UX §2 — wires change color/thickness based on active
 * values). A selected wire keeps its selection styling (highest precedence).
 */
export function setWireSignalState(
  group: Konva.Group,
  active: boolean,
  selected = false
): void {
  const theme = readRenderTheme();
  const color = selected
    ? theme.selected
    : active
      ? theme.signalOn
      : theme.signalOff;
  const width = selected
    ? WIRE_SELECTED_WIDTH
    : active
      ? WIRE_SIGNAL_ON_WIDTH
      : WIRE_STROKE_WIDTH;

  for (const line of wireGroupLines(group)) {
    line.stroke(color);
    line.strokeWidth(width);
  }

  for (const dot of group.getChildren(
    (child) => child.name() === "junction-dot"
  )) {
    if (dot instanceof Konva.Circle) dot.fill(color);
  }
}

const WIRE_WARNING_WIDTH = 2.5;

/**
 * Persistent problem styling for a lint-flagged wire (bit-width mismatch):
 * a yellow stroke until the issue is fixed. Selection styling keeps
 * precedence; clearing the flag restores the default accent stroke.
 */
export function setWireWarningState(
  group: Konva.Group,
  warned: boolean,
  selected = false
): void {
  const theme = readRenderTheme();
  const color = selected ? theme.selected : warned ? theme.warning : theme.accent;
  const width = selected
    ? WIRE_SELECTED_WIDTH
    : warned
      ? WIRE_WARNING_WIDTH
      : WIRE_STROKE_WIDTH;

  for (const line of wireGroupLines(group)) {
    line.stroke(color);
    line.strokeWidth(width);
  }

  for (const dot of group.getChildren(
    (child) => child.name() === "junction-dot"
  )) {
    if (dot instanceof Konva.Circle) dot.fill(color);
  }
}

/** Creates a draggable waypoint / junction handle square (shown when selected). */
export function createWaypointHandle(
  position: Pos,
  kind: "trunk-waypoint" | "branch-waypoint" | "junction",
  index: number,
  branchIndex: number
): Konva.Rect {
  const theme = readRenderTheme();
  const half = WAYPOINT_HANDLE_SIZE / 2;

  const handle = new Konva.Rect({
    x: position.x - half,
    y: position.y - half,
    width: WAYPOINT_HANDLE_SIZE,
    height: WAYPOINT_HANDLE_SIZE,
    fill: theme.accent,
    stroke: theme.bodyStroke,
    strokeWidth: 1,
    draggable: true,
    name: "waypoint-handle",
  });
  handle.setAttr("handleKind", kind);
  handle.setAttr("index", index);
  handle.setAttr("branchIndex", branchIndex);
  return handle;
}

/** Returns the scene-space center of a waypoint handle. */
export function getWaypointHandlePosition(handle: Konva.Rect): Pos {
  const half = WAYPOINT_HANDLE_SIZE / 2;
  return { x: handle.x() + half, y: handle.y() + half };
}

/** Moves a waypoint handle so its center sits at the given scene position. */
export function setWaypointHandlePosition(handle: Konva.Rect, pos: Pos): void {
  const half = WAYPOINT_HANDLE_SIZE / 2;
  handle.x(pos.x - half);
  handle.y(pos.y - half);
}

/** Removes every waypoint handle from a wire group. */
export function removeWaypointHandles(group: Konva.Group): void {
  for (const handle of group.getChildren(
    (child) => child.name() === "waypoint-handle"
  )) {
    handle.destroy();
  }
}
