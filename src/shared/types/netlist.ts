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
}
