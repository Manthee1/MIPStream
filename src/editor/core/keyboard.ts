/** @format */

/**
 * Active execution scopes for shortcut evaluation.
 * Modeled after VS Code's `when` clause contexts.
 */
export type ShortcutContext =
  | 'schematic:editor'
  | 'schematic:selection'
  | 'schematic:placing'
  | 'schematic:routing';

/**
 * A single keyboard binding. A binding only fires when at least one of its
 * required contexts is active. An empty/omitted context list is global.
 */
export interface ShortcutBinding {
  /** KeyboardEvent.key, normalized to lowercase (e.g. 'escape', 'delete', 'r'). */
  key: string;
  /** Contexts in which this shortcut is active. Empty = global. */
  contexts?: ShortcutContext[];
  /**
   * True: the binding only fires while Ctrl (⌘ on macOS) is held — combos
   * like Ctrl+C/Ctrl+V. False/omitted: only fires with no modifier held,
   * so plain tool keys ('v', 'w', 'd') never hijack combos or browser
   * shortcuts, and Alt-grave characters stay untouched.
   */
  ctrl?: boolean;
  /**
   * true: only fires while Shift is held; false: only without Shift;
   * omitted: either (ignored). Evaluated only for `ctrl` bindings so plain
   * tool keys keep their existing modifier semantics.
   */
  shift?: boolean;
  /** Returns true if the event was handled (consumed). */
  handler: (event: KeyboardEvent) => boolean | void;
}

/**
 * Tracks which UI execution scopes are currently active.
 * Contexts are pushed/popped by tool changes, selection state, and modal states.
 */
export class ContextTracker {
  private readonly active = new Set<ShortcutContext>();

  public enable(context: ShortcutContext): void {
    this.active.add(context);
  }

  public disable(context: ShortcutContext): void {
    this.active.delete(context);
  }

  public isActive(context: ShortcutContext): boolean {
    return this.active.has(context);
  }

  /** True if any of the given contexts are active. Empty list = always true. */
  public matches(contexts?: ShortcutContext[]): boolean {
    if (!contexts || contexts.length === 0) return true;
    return contexts.some((context) => this.active.has(context));
  }
}

/**
 * Global keyboard handler with scoped execution contexts.
 * Ignores keystrokes that originate from text-editing UI elements.
 */
export class ShortcutManager {
  private readonly bindings: ShortcutBinding[] = [];
  private readonly tracker: ContextTracker;

  private readonly keydownHandler = (event: KeyboardEvent) => {
    if (isTextEntryTarget(event.target)) return;

    const key = event.key.toLowerCase();
    const comboHeld = event.ctrlKey || event.metaKey;

    for (const binding of this.bindings) {
      if (binding.key !== key) continue;
      // Ctrl bindings need the combo held; plain bindings never swallow
      // modified keystrokes (plain 'v' must not eat Ctrl+V). An explicit
      // shift requirement disambiguates pairs like Ctrl+Z / Ctrl+Shift+Z.
      if (binding.ctrl === true) {
        if (!comboHeld) continue;
        if (binding.shift === true && !event.shiftKey) continue;
        if (binding.shift === false && event.shiftKey) continue;
      } else if (comboHeld || event.altKey) {
        continue;
      }
      if (!this.tracker.matches(binding.contexts)) continue;

      const handled = binding.handler(event);
      if (handled !== false) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
  };

  private attached = false;

  constructor(tracker: ContextTracker) {
    this.tracker = tracker;
  }

  public register(binding: ShortcutBinding): void {
    this.bindings.push(binding);
  }

  public attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.keydownHandler);
  }

  public detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.keydownHandler);
  }
}

/**
 * Keys typed into inputs, textareas, or contenteditable regions must never
 * trigger canvas-level key handling.
 */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
}
