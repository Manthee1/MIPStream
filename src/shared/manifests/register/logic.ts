/** @format */

/**
 * Pure D-type register transfer helpers shared by the Stage Register and
 * Program Counter manifests. The stored value is the register's output net —
 * held by the engine between clock edges.
 */
export function registerTransfer(data: number, bitWidth: number): number {
  if (bitWidth >= 32) return data >>> 0;
  if (bitWidth <= 0) return 0;
  return ((data >>> 0) & (2 ** bitWidth - 1)) >>> 0;
}
