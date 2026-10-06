/** @format */

import type { Pos } from "../types/manifest";

/** Squared distance from point `p` to segment `ab`. */
function squaredDistanceToSegment(p: Pos, a: Pos, b: Pos): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    const ex = p.x - a.x;
    const ey = p.y - a.y;
    return ex * ex + ey * ey;
  }

  // Projection factor of p onto ab, clamped to the segment.
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  const ex = p.x - cx;
  const ey = p.y - cy;
  return ex * ex + ey * ey;
}

/** Distance from point `p` to segment `ab`. */
export function distanceToSegment(p: Pos, a: Pos, b: Pos): number {
  return Math.sqrt(squaredDistanceToSegment(p, a, b));
}

/** Closest point on segment `ab` to point `p`. */
export function closestPointOnSegment(p: Pos, a: Pos, b: Pos): Pos {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return { x: a.x, y: a.y };

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/**
 * Finds the closest point on a polyline (given as a flat [x0, y0, x1, y1, ...]
 * array in scene coordinates) to `p`, within `maxDistance`. Returns null when
 * no segment is close enough.
 */
export function closestPointOnPolyline(
  p: Pos,
  points: number[],
  maxDistance: number
): Pos | null {
  let best: Pos | null = null;
  let bestDistance = maxDistance;

  for (let i = 0; i + 3 < points.length; i += 2) {
    const a = { x: points[i], y: points[i + 1] };
    const b = { x: points[i + 2], y: points[i + 3] };
    const distance = distanceToSegment(p, a, b);
    if (distance <= bestDistance) {
      best = closestPointOnSegment(p, a, b);
      bestDistance = distance;
    }
  }

  return best;
}

/** Flattens a list of points into a Konva-style [x0, y0, x1, y1, ...] array. */
export function flattenPoints(points: Pos[]): number[] {
  const flat: number[] = [];
  for (const point of points) flat.push(point.x, point.y);
  return flat;
}

/**
 * Collapses a polyline vertex list: consecutive duplicates and collinear
 * middle vertices are removed, leaving only meaningful bends.
 */
export function collapsePolylineVertices(vertices: Pos[]): Pos[] {
  const result: Pos[] = [];
  for (const vertex of vertices) {
    const last = result.length - 1;
    if (last >= 0 && result[last].x === vertex.x && result[last].y === vertex.y) continue;
    result.push(vertex);
  }

  // Remove collinear middles (axis-aligned polylines only need straight checks).
  const collapsed: Pos[] = [];
  for (let i = 0; i < result.length; i++) {
    const prev = collapsed[collapsed.length - 1];
    const next = result[i + 1];
    if (prev && next) {
      const aligned =
        (prev.x === result[i].x && next.x === result[i].x) ||
        (prev.y === result[i].y && next.y === result[i].y);
      if (aligned) continue;
    }
    collapsed.push(result[i]);
  }

  return collapsed;
}

/** Axis-aligned rectangle in scene coordinates. */
export interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** True when two axis-aligned rectangles overlap. */
export function rectsIntersect(a: SceneRect, b: SceneRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
