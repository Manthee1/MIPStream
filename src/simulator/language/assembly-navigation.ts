/** @format */

import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

/**
 * Every `name:` label definition in the source → its 1-based line. Mirrors
 * the assembler's label predicate (identifier + glued colon, first token on
 * the line); comment-stripped, CRLF-safe. Pure — the completion source and
 * go-to-definition both consume it.
 */
export function findLabelDefinitions(source: string): Map<string, number> {
  const labels = new Map<string, number>();
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const labelPattern = /^([A-Za-z_]\w*):(?![\w:])/;

  for (let index = 0; index < lines.length; index++) {
    const content = lines[index].split(/[;#]/)[0].trim();
    const match = labelPattern.exec(content);
    if (match) labels.set(match[1], index + 1);
  }
  return labels;
}

/**
 * Ctrl/⌘+Click on a label reference jumps to its `name:` definition line
 * (task -0). Editor-local only — labels resolve from the document itself.
 */
export function assemblyGoToDefinition(): Extension {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (event.button !== 0 || !(event.ctrlKey || event.metaKey)) return false;

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return false;

      const word = view.state.wordAt(pos);
      if (word === null) return false;
      const name = view.state.sliceDoc(word.from, word.to);
      if (!/^[A-Za-z_]\w*$/.test(name)) return false;

      const line = findLabelDefinitions(view.state.doc.toString()).get(name);
      if (line === undefined) return false;

      const target = view.state.doc.line(line);
      view.dispatch({
        selection: { anchor: target.from },
        effects: EditorView.scrollIntoView(target.from, { y: 'center' }),
      });
      return true; // consume — suppress the text-cursor move
    },
  });
}
