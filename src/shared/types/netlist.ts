/** @format */

import type { Pos } from "./manifest";

/** A module port that a net attaches to. */
export interface NetEndpoint {
  /** Module instance designator (e.g., "u1"). */
  designator: string;
  /** Port ID on the module manifest (e.g., "in0"). */
  portId: string;
}

/**
 * Rendering style of a net's wires (dotted, dashed, solid). Purely visual —
 * connectivity stays in `source`/`targets` and the engine never reads it.
 */
export type NetStyle = 'solid' | 'dashed' | 'dotted';

/**
 * A fan-out branch: a target input port that taps an existing net trunk at an
 * explicit junction point. Rendering only — connectivity stays in
 * `SerializedNet.targets` so the engine contract is unchanged.
 */
export interface NetBranch {
  /** The input port this branch feeds. */
  target: NetEndpoint;
  /** Scene point where the branch taps the trunk (rendered as a junction dot). */
  junction: Pos;
  /** Branch routing bends, from the junction toward the target port. */
  waypoints?: Pos[];
  /** True when the branch's geometry is free-form (Alt-dragged, possibly diagonal). */
  freeform?: true;
}

/** Data-only net representation, suitable for JSON serialization. */
export interface SerializedNet {
  id: string;
  /** The output port driving this net. */
  source: NetEndpoint;
  /** The input ports driven by the source. */
  targets: NetEndpoint[];
  /** Trunk routing bends (source → targets[0]) in scene coordinates. */
  waypoints?: Pos[];
  /** Fan-out branches for targets[1..n]; branches[i] routes targets[i + 1]. */
  branches?: NetBranch[];
  /** Render style of the trunk and branches. Defaults to 'solid'. */
  style?: NetStyle;
  /**
   * True when the trunk's geometry is free-form (Alt-dragged, possibly
   * diagonal) and must render verbatim instead of re-composing orthogonal
   * L-corners. Rendering only — the engine never reads it.
   */
  freeform?: true;
}
