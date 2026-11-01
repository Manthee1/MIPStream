/** @format */

import type { ProjectEditor } from "../types/project";

/**
 * Clean assembly template every new editor starts from (SIMULATOR_OVERVIEW
 * §1: a project with an editor module initializes with the standard `.data`
 * and `.text` segment declarations). `#` is the MIPS-style comment introducer
 * the tokenizer strips.
 */
export const DEFAULT_EDITOR_SOURCE = '.data\n\n.text\nmain:\n    # write your program here\n';

/**
 * A new project editor with a collision-free id and display name, seeded with
 * the clean assembly template. Pure — the caller appends it to the drafted
 * editor list (settings) or a new project (templates).
 */
export function createEditor(existing: ProjectEditor[]): ProjectEditor {
  const ids = new Set(existing.map((editor) => editor.id));
  const names = new Set(existing.map((editor) => editor.name));

  let index = existing.length + 1;
  while (ids.has(`code-${index}`)) index++;
  const id = `code-${index}`;

  let name = `${id}.s`;
  let suffix = 2;
  while (names.has(name)) name = `${id}-${suffix++}.s`;

  return { id, name, sourceCode: DEFAULT_EDITOR_SOURCE };
}