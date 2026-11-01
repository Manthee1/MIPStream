import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue';
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';

type Theme = 'light' | 'dark';

interface UseCodeMirrorOptions {
  /** Element the EditorView mounts into (resolved lazily — may start null). */
  container: Ref<HTMLElement | null>;
  /** Current document source; read once at view creation. */
  initialDoc: () => string;
  /** Fires on every document change (user edit or external replacement). */
  onDocChange: (doc: string) => void;
  /**
   * Language-specific support bundle, built once at view creation (the
   * assembly editor passes `buildAssemblySupport`). NOTE: this base list is
   * `basicSetup` minus `autocompletion()` — the support bundle owns the
   * single autocompletion instance, so there is never a duplicate
   * registration.
   */
  support?: () => Extension[];
}

/**
 * `basicSetup` minus `autocompletion()` — the support bundle registers the
 * one and only completion source (an `override` source over the ISA).
 */
const baseExtensions: Extension[] = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
];

/**
 * CodeMirror 6 host (the editor foundation — every editor feature attaches
 * here as an extension through the support bundle: highlighting, lint,
 * completion, current-instruction highlighting). Owns view creation, the
 * token-synced light/dark theme via a Compartment (retheming never rebuilds
 * the document state), the support compartment (same guarantee for ISA
 * swaps) and the diagnostics-reveal primitive (1-based line / 0-based column
 * range — the assembler diagnostics contract).
 *
 * The component supplies the document through the model; this composable
 * never owns project state.
 */
export function useCodeMirror(options: UseCodeMirrorOptions) {
  const view = shallowRef<EditorView | null>(null);
  const themeCompartment = new Compartment();
  const supportCompartment = new Compartment();
  /** Support bundle applied before the view existed (replayed at creation). */
  let pendingSupport: Extension[] = [];

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
      '.cm-current-instruction': {
        backgroundColor: dark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.15)',
        boxShadow: 'inset 2px 0 0 var(--color-warning)',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeft: '2px solid var(--color-primary)',
      },
      '&.cm-focused > .cm-scroller > .cm-layer.cm-selectionLayer .cm-selectionBackground, ::selection': {
        backgroundColor: dark ? 'rgba(2, 132, 199, 0.4)' : 'rgba(90, 130, 216, 0.25)',
      },
    }, { dark });
  }

  function createView(parent: HTMLElement): EditorView {
    pendingSupport = options.support?.() ?? [];
    return new EditorView({
      parent,
      state: EditorState.create({
        doc: options.initialDoc(),
        extensions: [
          baseExtensions,
          themeCompartment.of(editorTheme(initialDark)),
          supportCompartment.of(pendingSupport),
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
   * Swaps the language support bundle (e.g. a new ISA after a settings
   * commit) in place — the document state, history and selection survive.
   * Recorded and replayed if the view does not exist yet.
   */
  function setSupport(extensions: Extension[]): void {
    pendingSupport = extensions;
    view.value?.dispatch({ effects: supportCompartment.reconfigure(extensions) });
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

  return { view, setDoc, setSupport, revealPosition };
}