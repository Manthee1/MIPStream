/** @format */

import type { Pos } from "./manifest";

/** A module port that a net attaches to. */
export interface NetEndpoint {
  /** Module instance designator (e.g., "u1"). */
  designator: string;
  /** Port ID on the module manifest (e.g., "in0"). */
  portId: string;
}

/** Data-only net representation, suitable for JSON serialization. */
export interface SerializedNet {
  id: string;
  /** The output port driving this net. */
  source: NetEndpoint;
  /** The input ports driven by the source. */
  targets: NetEndpoint[];
  /** User-placed routing bends in scene coordinates. */
  waypoints?: Pos[];
}
