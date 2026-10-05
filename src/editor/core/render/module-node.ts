/** @format */

import Konva from "konva";
import type { HydratedModule, ModuleRenderOptions, Pos } from "@/shared/types/manifest";
import { drawDefaultBody } from "./default-body";
import { readRenderTheme } from "./theme";

const PORT_RADIUS = 4;
const PORT_HIT_RADIUS = 9;
const SELECTED_STROKE_WIDTH = 2;

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

  drawPorts(group, module.ports, theme.accent, theme.bodyStroke);

  return group;
}

/** Draws the port visuals and hit targets from the port definitions. */
function drawPorts(
  group: Konva.Group,
  ports: HydratedModule["ports"],
  accent: string,
  stroke: string
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
  }
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
