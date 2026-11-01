/** @format */

/**
 * Light instruction-text normalization for the stage visualizer: the
 * instruction renders "as written in the editor" — comments stripped and
 * whitespace collapsed, nothing else reformatted.
 */
export function normalizeInstructionText(raw: string): string {
  return raw.split(/[;#]/)[0].trim().replace(/\s+/g, " ");
}
