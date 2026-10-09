/** @format */

/**
 * Pure multiplexer selection shared by every mux variant manifest.
 * `values` is ordered data-input first; the selector index is last.
 */
export function selectMuxInput(
  values: ArrayLike<number>,
  sel: number,
  numInputs: number
): number {
  const index = sel >>> 0;
  return index < numInputs ? values[index] >>> 0 : 0;
}
