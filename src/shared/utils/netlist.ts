/** @format */

import type { NetEndpoint, SerializedNet } from "../types/netlist";

/** True when both endpoints reference the same module port. */
export function isSameEndpoint(a: NetEndpoint, b: NetEndpoint): boolean {
  return a.designator === b.designator && a.portId === b.portId;
}

/** Finds the net attached to a given module port, if any. */
export function findNetWithPort(
  nets: SerializedNet[],
  endpoint: NetEndpoint
): SerializedNet | undefined {
  return nets.find(
    (net) =>
      isSameEndpoint(net.source, endpoint) ||
      net.targets.some((target) => isSameEndpoint(target, endpoint))
  );
}

/** Finds the net currently driving a given input port, if any. */
export function netDrivingInput(
  nets: SerializedNet[],
  endpoint: NetEndpoint
): SerializedNet | undefined {
  return nets.find((net) =>
    net.targets.some((target) => isSameEndpoint(target, endpoint))
  );
}
