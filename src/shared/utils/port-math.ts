/** @format */

import type { Pos, PortDefinition } from "../types/manifest";

/** A port paired with its module-local (unrotated) position. */
export interface PortAnchor {
  port: PortDefinition;
  position: Pos;
}

/** Axis-aligned bounds in module-local coordinates. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Rotates a point around the origin (0, 0) by `rotation` degrees clockwise,
 * matching Konva's transform convention (y-axis points down).
 */
export function rotatePoint(point: Pos, rotation: number): Pos {
  if (rotation % 360 === 0) {
    return { x: point.x, y: point.y };
  }
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

/** Converts port definitions into local anchors; ports without positions fall back to the origin. */
export function portAnchors(ports: PortDefinition[]): PortAnchor[] {
  return ports.map((port) => ({
    port,
    position: port.position ? { x: port.position.x, y: port.position.y } : { x: 0, y: 0 },
  }));
}

/** Bounding box around the given anchors, expanded by `padding` on all sides. */
export function portBounds(anchors: PortAnchor[], padding: number): Bounds {
  if (anchors.length === 0) {
    return {
      minX: -padding,
      minY: -padding,
      maxX: padding,
      maxY: padding,
      width: padding * 2,
      height: padding * 2,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const anchor of anchors) {
    if (anchor.position.x < minX) minX = anchor.position.x;
    if (anchor.position.y < minY) minY = anchor.position.y;
    if (anchor.position.x > maxX) maxX = anchor.position.x;
    if (anchor.position.y > maxY) maxY = anchor.position.y;
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/**
 * Scene (world) position of a module-local point, given the module's own
 * position and rotation. Foundation for wire endpoint calculation.
 */
export function worldPosition(modulePosition: Pos, rotation: number, point: Pos): Pos {
  const rotated = rotatePoint(point, rotation);
  return {
    x: modulePosition.x + rotated.x,
    y: modulePosition.y + rotated.y,
  };
}
