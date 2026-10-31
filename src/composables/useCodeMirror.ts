import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue';
import { EditorView } from '@codemirror/view';
import { Compartment, EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';

type Theme = 'light' | 'dark';

interface UseCodeMirrorOptions {
  /** Element the EditorView mounts into (resolved lazily — may start null). */
  container: Ref<HTMLElement | null>;
  /** Current document source; read once at view creation. */
  initialDoc: () => string;
  /** Fires on every document change (user edit or external replacement). */
  onDocChange: (doc: string) => void;
}

/**
 * CodeMirror 6 host (Phase 4 foundation — every later editor feature attaches
 * here as an extension: highlighting, lint, completion, current-instruction
 * highlighting). Owns view creation, the token-synced light/dark theme via a
 * Compartment (retheming never rebuilds the document state), and the
 * diagnostics-reveal primitive (1-based line / 0-based column range — the
 * assembler diagnostics contract).
 *
 * The component supplies the document through the model; this composable
 * never owns project state.
 */
export function useCodeMirror(options: UseCodeMirrorOptions) {
  const view = shallowRef<EditorView | null>(null);
  const themeCompartment = new Compartment();

  /**
   * Initial theme read from the document element (`useTheme` applies the
   * class/attr at app init). Later flips arrive through the app-wide
   * `theme-change` window event — `useTheme()` refs are per-instance, so
   * watching an instance that never toggles would silently never fire
   * (the same pattern `App.vue` uses for the Naive UI theme).
   */
  const initialDark = typeof document !== 'undefined'
    && (document.documentElement.classList.contains('dark')
      || document.documentElement.getAttribute('data-theme') === 'dark');

  function applyTheme(theme: Theme): void {
    view.value?.dispatch({
      effects: themeCompartment.reconfigure(editorTheme(theme === 'dark')),
    });
  }

  const themeChangeHandler = (event: Event): void => {
    const theme = (event as CustomEvent<{ theme: Theme }>).detail?.theme;
    if (theme === 'dark' || theme === 'light') applyTheme(theme);
  };

  /** Token-driven editor theme — jagged aesthetic, no rounding, app colors. */
  function editorTheme(dark: boolean) {
    return EditorView.theme({
      '&': {
        color: 'var(--text-primary)',
        backgroundColor: 'var(--bg-surface)',
        height: '100%',
      },
      '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
        fontSize: '12.5px',
        lineHeight: '1.5',
      },
      '.cm-content': { padding: '6px 0' },
      '.cm-gutters': {
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        border: 'none',
        fontSize: '11px',
      },
      '.cm-activeLine': {
        backgroundColor: dark ? 'rgba(148, 163, 184, 0.07)' : 'rgba(90, 130, 216, 0.07)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: dark ? 'rgba(148, 163, 184, 0.07)' : 'rgba(90, 130, 216, 0.07)',
        color: 'var(--text-primary)',
      },
      '&.cm-focused': { outline: 'none' },
      '.cm-cursor, .cm-dropCursor': {
        borderLeft: '2px solid var(--color-primary)',
      },
      '&.cm-focused > .cm-scroller > .cm-layer.cm-selectionLayer .cm-selectionBackground, ::selection': {
        backgroundColor: dark ? 'rgba(2, 132, 199, 0.4)' : 'rgba(90, 130, 216, 0.25)',
      },
    }, { dark });
  }

  function createView(parent: HTMLElement): EditorView {
    return new EditorView({
      parent,
      state: EditorState.create({
        doc: options.initialDoc(),
        extensions: [
          basicSetup,
          themeCompartment.of(editorTheme(initialDark)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              options.onDocChange(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
  }

  // Lazily create the view once the container element exists (the host
  // component may render it conditionally).
  watch(options.container, (parent) => {
    if (parent && !view.value) view.value = createView(parent);
  }, { immediate: true, flush: 'post' });

  // Retheme on app-wide theme flips without rebuilding the document state.
  if (typeof window !== 'undefined') {
    window.addEventListener('theme-change', themeChangeHandler);
  }

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('theme-change', themeChangeHandler);
    }
    view.value?.destroy();
    view.value = null;
  });

  /** Replaces the whole document when the source changed outside the editor. */
  function setDoc(source: string): void {
    const editor = view.value;
    if (!editor) return;
    if (editor.state.doc.toString() === source) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: source } });
  }

  /**
   * Reveals and selects a 1-based line / 0-based column range (the assembler
   * diagnostics contract), centering it in the viewport.
   */
  function revealPosition(line: number, columnStart: number, columnEnd: number): void {
    const editor = view.value;
    if (!editor) return;
    const clampedLine = Math.min(Math.max(1, line), editor.state.doc.lines);
    const lineInfo = editor.state.doc.line(clampedLine);
    const anchor = Math.min(lineInfo.from + Math.max(0, columnStart), lineInfo.to);
    const head = Math.min(lineInfo.from + Math.max(0, columnEnd), lineInfo.to);
    editor.dispatch({
      selection: { anchor, head },
      effects: EditorView.scrollIntoView(anchor, { y: 'center' }),
    });
    editor.focus();
  }

  return { view, setDoc, revealPosition };
}