/** @format */

/**
 * Pure register-file storage helpers. The engine creates the state via the
 * manifest's `createInitialState` and passes the reference back through the
 * config so evaluation closures can capture it.
 */
export interface RegisterFileState {
  values: Uint32Array;
}

export function createRegisterFileState(registerCount: number): RegisterFileState {
  return { values: new Uint32Array(Math.max(2, registerCount | 0)) };
}

/** Reads a register; $zero (address 0) is hardwired to 0. */
export function readRegister(state: RegisterFileState, address: number, mask: number): number {
  const index = address >>> 0;
  if (index === 0 || index >= state.values.length) return 0;
  return (state.values[index] & mask) >>> 0;
}

/** Writes a register unless it is $zero or out of range. */
export function writeRegister(
  state: RegisterFileState,
  address: number,
  value: number,
  mask: number
): void {
  const index = address >>> 0;
  if (index === 0 || index >= state.values.length) return;
  state.values[index] = (value & mask) >>> 0;
}
