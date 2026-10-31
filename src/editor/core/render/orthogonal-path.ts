/** @format */

import type { Pos } from "@/shared/types/manifest";

/**
 * Computes the corner point of an L-shaped orthogonal segment between two
 * points, placing the longer leg first for a natural schematic look.
 */
function cornerBetween(from: Pos, to: Pos): Pos {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  return dx >= dy
    ? { x: to.x, y: from.y } // horizontal first
    : { x: from.x, y: to.y }; // vertical first
}

/**
 * Composes the polyline for a free-form (Alt-dragged) path: straight segments
 * through the anchors, without the orthogonal L-corner insertion. Used by
 * nets whose geometry was hand-dragged diagonally and must render verbatim.
 */
export function composeNetPathVerbatim(source: Pos, waypoints: Pos[], target: Pos): number[] {
  const anchors = [source, ...waypoints, target];
  const deduped: number[] = [];

  for (const anchor of anchors) {
    const last = deduped.length - 1;
    if (last >= 0 && deduped[last] === anchor.x && deduped[last - 1] === anchor.y) continue;
    deduped.push(anchor.x, anchor.y);
  }

  return deduped;
}

/**
 * Composes the polyline points for a net path: source → waypoints → target,
 * each consecutive pair joined by an orthogonal L-segment. Consecutive
 * duplicate points are collapsed for clean rendering.
 */
export function composeNetPath(source: Pos, waypoints: Pos[], target: Pos): number[] {
  const anchors = [source, ...waypoints, target];
  const points: number[] = [source.x, source.y];

  for (let i = 1; i < anchors.length; i++) {
    const from = anchors[i - 1];
    const to = anchors[i];
    const corner = cornerBetween(from, to);
    points.push(corner.x, corner.y, to.x, to.y);
  }

  // Collapse consecutive duplicates (collinear or zero-length legs).
  const deduped: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    const last = deduped.length - 1;
    if (last >= 0 && deduped[last] === x && deduped[last - 1] === y) continue;
    deduped.push(x, y);
  }

  return deduped;
}
