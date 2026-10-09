/** @format */

/**
 * Pure word-addressed storage shared by the Instruction and Data memory
 * manifests. The engine creates the state via the manifest's
 * `createInitialState` and passes the reference back through the config so
 * the evaluation closures can capture it. Components never own state.
 */
export interface WordMemoryState {
  /** Word-indexed storage (word i lives at byte address i * 4). */
  words: Uint32Array;
}

export function createWordMemoryState(wordCount: number): WordMemoryState {
  return { words: new Uint32Array(Math.max(1, wordCount | 0)) };
}

/** Byte address to word index; -1 when out of range. */
export function wordIndex(address: number, wordCount: number): number {
  const index = (address >>> 0) >>> 2;
  return index < wordCount ? index : -1;
}

export function readWord(state: WordMemoryState, address: number, mask: number): number {
  const index = wordIndex(address, state.words.length);
  if (index === -1) return 0;
  return (state.words[index] & mask) >>> 0;
}

export function writeWord(
  state: WordMemoryState,
  address: number,
  value: number,
  mask: number
): void {
  const index = wordIndex(address, state.words.length);
  if (index !== -1) state.words[index] = (value & mask) >>> 0;
}
