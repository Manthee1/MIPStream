/** @format */

import Konva from "konva";
import type { HydratedModule, ModuleRenderOptions, Pos } from "@/shared/types/manifest";
import { drawDefaultBody } from "./default-body";
import { readRenderTheme } from "./theme";

const PORT_RADIUS = 4;
const PORT_HIT_RADIUS = 9;
const SELECTED_STROKE_WIDTH = 2;
const PORT_VALUE_FONT_SIZE = 9;
/** Gap between the port pin and its runtime value label. */
const PORT_VALUE_OFFSET = 8;
/** Label box width — keeps `align: "right"` working on left-side ports. */
const PORT_VALUE_WIDTH = 88;

/**
 * Assembles a Konva.Group for a hydrated module instance:
 *
 * 1. Body: the manifest's custom `render` when provided, otherwise the default
 *    port-derived rectangle. Drawn in module-local coordinates.
 * 2. Ports: circles + generous hit targets drawn by this module from the same
 *    `HydratedModule.ports` array used for connectivity — the visual port and
 *    the logical connection point can never drift.
 *
 * Position/rotation are applied via the group transform, so rotation stays in
 * sync with the world-position math used for wire endpoints.
 */
export function createModuleNode(
  module: HydratedModule,
  mode: "editor" | "viewer"
): Konva.Group {
  const theme = readRenderTheme();

  const group = new Konva.Group({
    x: module.position.x,
    y: module.position.y,
    rotation: module.rotation,
    draggable: mode === "editor",
    name: "module-node",
  });

  group.setAttr("designator", module.designator);
  group.setAttr("typeId", module.typeId);

  const options: ModuleRenderOptions = {
    config: module.config,
    ports: module.ports,
    rotation: module.rotation,
    mode,
    label: module.manifest.label,
    theme,
  };

  const size = module.manifest.render
    ? module.manifest.render(group, options)
    : drawDefaultBody(group, options);

  group.setAttr("bodyWidth", size.width);
  group.setAttr("bodyHeight", size.height);

  drawPorts(group, module.ports, theme.accent, theme.bodyStroke, theme.text);

  return group;
}

/** Draws the port visuals and hit targets from the port definitions. */
function drawPorts(
  group: Konva.Group,
  ports: HydratedModule["ports"],
  accent: string,
  stroke: string,
  text: string
): void {
  for (const port of ports) {
    if (!port.position) continue;
    const { x, y } = port.position;

    const visual = new Konva.Circle({
      x,
      y,
      radius: PORT_RADIUS,
      fill: accent,
      stroke,
      strokeWidth: 1,
      name: "port",
      listening: false,
    });
    visual.setAttr("portId", port.id);
    visual.setAttr("direction", port.direction);
    visual.setAttr("bits", port.bits);

    // Invisible, oversized hit target for precise wiring interactions.
    const hit = new Konva.Circle({
      x,
      y,
      radius: PORT_HIT_RADIUS,
      fill: "transparent",
      name: "port-hit",
    });
    hit.setAttr("portId", port.id);
    hit.setAttr("direction", port.direction);
    hit.setAttr("bits", port.bits);

    group.add(visual);
    group.add(hit);

    // Runtime value label, beside the pin: right of right-edge ports,
    // left of left-edge ports, vertically centered. Created hidden — only
    // the Simulate perspective's sampler ever writes it (setPortValueLabel),
    // so the Design perspective never renders values by construction.
    const label = new Konva.Text({
      x: x >= 0 ? x + PORT_VALUE_OFFSET : x - PORT_VALUE_OFFSET - PORT_VALUE_WIDTH,
      y: y - PORT_VALUE_FONT_SIZE / 2,
      width: PORT_VALUE_WIDTH,
      text: "",
      fontSize: PORT_VALUE_FONT_SIZE,
      fontFamily: "monospace",
      fill: text,
      align: x >= 0 ? "left" : "right",
      listening: false,
      visible: false,
      name: "port-value",
    });
    label.setAttr("portId", port.id);

    group.add(label);
  }
}

/**
 * Lifts a module's hidden runtime value label out of its module group into
 * the top value layer, so the number renders **above** the wires (wire groups
 * draw after module groups in the logic layer). The anchor is converted to
 * scene coordinates via the group's own transform (position + rotation) and
 * the label takes over the module's rotation — the value layer carries no
 * transform, and stage pan/zoom applies above all layers, so the lifted label
 * stays glued to its pin. Remains hidden until first written; returns the
 * lifted label or null if the port has no label.
 */
export function liftPortValueLabel(
  group: Konva.Group,
  portId: string,
  layer: Konva.Layer
): Konva.Text | null {
  const label = group.getChildren(
    (node) => node.name() === "port-value" && node.getAttr("portId") === portId
  )[0];
  if (!(label instanceof Konva.Text)) return null;

  label.position(group.getTransform().point({ x: label.x(), y: label.y() }));
  label.rotation(group.rotation());
  label.moveTo(layer);
  return label;
}

/**
 * Writes the live runtime value into a lifted port value label. `null` hides
 * the label. The fill re-resolves from the theme so dark/light flips stay
 * correct.
 */
export function setPortValueLabel(
  label: Konva.Text | null,
  text: string | null
): void {
  if (!label) return;

  if (text === null) {
    label.text("");
    label.visible(false);
    return;
  }

  label.fill(readRenderTheme().text);
  label.text(text);
  label.visible(true);
}

/** Toggles the selection highlight on a module node's body. */
export function setNodeSelected(group: Konva.Group, selected: boolean): void {
  const body = group.findOne(".module-body");
  if (!(body instanceof Konva.Shape)) return;

  const theme = readRenderTheme();
  body.stroke(selected ? theme.selected : theme.bodyStroke);
  body.strokeWidth(selected ? SELECTED_STROKE_WIDTH : 1.5);
  body.strokeScaleEnabled(false);
}

/** Delete-tool hover feedback on a module node's body. */
export function setNodeDangerHover(group: Konva.Group, danger: boolean): void {
  const body = group.findOne(".module-body");
  if (!(body instanceof Konva.Shape)) return;

  const theme = readRenderTheme();
  body.stroke(danger ? theme.danger : theme.bodyStroke);
  body.strokeWidth(danger ? SELECTED_STROKE_WIDTH : 1.5);
  body.strokeScaleEnabled(false);
}

/** Viewer/editor hover emphasis on a module node's body (accent stroke). */
export function setNodeHover(group: Konva.Group, hovered: boolean): void {
  const body = group.findOne(".module-body");
  if (!(body instanceof Konva.Shape)) return;

  const theme = readRenderTheme();
  body.stroke(hovered ? theme.accent : theme.bodyStroke);
  body.strokeWidth(hovered ? SELECTED_STROKE_WIDTH : 1.5);
  body.strokeScaleEnabled(false);
}

/** Visual states a port can render in while interacting with the canvas. */
export type PortHighlightState = "idle" | "hover" | "valid" | "warning";

/**
 * Applies a highlight state to a module port:
 * - `hover`: enlarged port under the cursor while routing.
 * - `valid`: success-colored ring marking a legally connectable target.
 * - `warning`: yellow ring marking a direction-legal but width-mismatched
 *   target — connectable, but it will be flagged by the lint pass.
 * - `idle`: normal rendering.
 */
export function setPortHighlighted(
  group: Konva.Group,
  portId: string,
  state: PortHighlightState | boolean
): void {
  const circle = group.getChildren(
    (node) => node.name() === "port" && node.getAttr("portId") === portId
  )[0];
  if (!(circle instanceof Konva.Circle)) return;

  const normalized: PortHighlightState =
    typeof state === "boolean" ? (state ? "hover" : "idle") : state;

  if (normalized === "valid" || normalized === "warning") {
    const theme = readRenderTheme();
    const color = normalized === "warning" ? theme.warning : theme.valid;
    circle.fill(color);
    circle.stroke(color);
    circle.radius(PORT_RADIUS * 1.5);
    circle.strokeWidth(2);
    return;
  }

  const theme = readRenderTheme();
  circle.fill(theme.accent);
  circle.stroke(theme.bodyStroke);
  circle.radius(normalized === "hover" ? PORT_RADIUS * 1.5 : PORT_RADIUS);
  circle.strokeWidth(normalized === "hover" ? 2 : 1);
}

/**
 * Persistent problem highlight on a port (lint-flagged, e.g. a bit-width
 * mismatch): a yellow ring that survives until the issue is fixed. Route
 * highlight states take precedence while a route is pending.
 */
export function setPortWarning(group: Konva.Group, portId: string, warned: boolean): void {
  const circle = group.getChildren(
    (node) => node.name() === "port" && node.getAttr("portId") === portId
  )[0];
  if (!(circle instanceof Konva.Circle)) return;

  const theme = readRenderTheme();
  circle.stroke(warned ? theme.warning : theme.bodyStroke);
  circle.strokeWidth(warned ? 2 : 1);
  circle.radius(warned ? PORT_RADIUS * 1.35 : PORT_RADIUS);
}

/**
 * Scene (world) position of a module port, computed through the live Konva
 * transform so it stays correct even while the node is mid-drag.
 * Returns coordinates in layer space — the same space wires are drawn in.
 */
export function nodePortWorldPosition(group: Konva.Group, portId: string): Pos | null {
  const ports = group.getChildren(
    (node) => node.name() === "port" && node.getAttr("portId") === portId
  );
  const circle = ports[0];
  if (!circle) return null;

  const layer = group.getLayer();
  if (!layer) return null;

  const pos = circle.getAbsolutePosition(layer);
  return { x: pos.x, y: pos.y };
}
