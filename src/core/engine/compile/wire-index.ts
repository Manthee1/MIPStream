/** @format */

/**
 * Flat wire-buffer slot allocation (ENGINE_SPEC §1).
 *
 * Every net in the architecture occupies exactly one contiguous slot in the
 * global `Uint32Array` signal buffer. Slot 0 is the constant-zero rail read
 * by undriven inputs; nets and private slots for unconnected output ports
 * (so runtime probing still reads their values) are allocated from 1 upward.
 */

/** Reserved slot that always reads 0 (undriven inputs). */
export const ZERO_SLOT = 0;

/** Stable map key for a module port. */
export function portKey(designator: string, portId: string): string {
  return `${designator}:${portId}`;
}

/** Allocates net/port slots and maintains the net/port lookup maps. */
export class WireIndex {
  private nextSlot = ZERO_SLOT + 1;

  /** net id → allocated slot. */
  public readonly netIndexById = new Map<string, number>();
  /** port key → slot (an output's net slot, or an input's driving net slot). */
  public readonly portIndexByKey = new Map<string, number>();

  /** Total slot count including the zero rail — the wire buffer's length. */
  public get slotCount(): number {
    return this.nextSlot;
  }

  /** Allocates the next free slot. */
  public allocateSlot(): number {
    return this.nextSlot++;
  }

  /** Binds a net to its slot. */
  public registerNet(netId: string, slot: number): void {
    this.netIndexById.set(netId, slot);
  }

  /** Binds a module port to a slot. */
  public registerPort(designator: string, portId: string, slot: number): void {
    this.portIndexByKey.set(portKey(designator, portId), slot);
  }

  /** The slot bound to a module port, if any. */
  public getPortSlot(designator: string, portId: string): number | undefined {
    return this.portIndexByKey.get(portKey(designator, portId));
  }
}
