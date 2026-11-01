/** @format */

import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';

/** Marks the 1-based source line of the currently executing instruction (null clears). */
export const setCurrentInstructionLine = StateEffect.define<number | null>();

const activeInstructionLine = Decoration.line({ class: 'cm-current-instruction' });

/**
 * Current-instruction highlight (task -0): a StateField holding one line
 * decoration. The editor component derives the line (live PC → instruction
 * index → the load-time `pcLineMap`) and dispatches the effect; the field
 * maps the decoration across document edits so typing keeps the highlight
 * on the right line.
 *
 * Exposed as a named field (typed for headless tests) — the same instance is
 * safely shared by every editor state that installs it.
 */
export const currentInstructionField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setCurrentInstructionLine)) continue;
      const line = effect.value;
      const doc = transaction.state.doc;
      if (line === null || line < 1 || line > doc.lines) {
        next = Decoration.none;
      } else {
        next = Decoration.set([activeInstructionLine.range(doc.line(line).from)]);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** The field as a plain extension for the support bundle. */
export function currentInstructionHighlight(): Extension {
  return currentInstructionField;
}
