/** @format */

import type { SerializedModule } from "@/shared/types/manifest";
import type { SerializedNet } from "@/shared/types/netlist";
import type { ArchitectureConfiguration } from "@/shared/types/architecture";
import type { ProjectEditor } from "@/shared/types/project";

/**
 * Committed-document snapshot: everything a document restore needs. Entries
 * are deep copies — the designer keeps mutating its live data after capture.
 */
export interface HistoryEntry {
  modules: SerializedModule[];
  nets: SerializedNet[];
  /** Next designator counters, so undo never re-allocates live ids. */
  moduleCounter: number;
  netCounter: number;
  /**
   * Architecture configuration to restore alongside the document. Set only
   * on settings-batch entries (the cascade mutates canvas AND configuration).
   */
  configuration?: ArchitectureConfiguration;
  /**
   * Project editors (software layer) to restore alongside the configuration.
   * Set only on settings-batch entries that also changed the editor set.
   */
  editors?: ProjectEditor[];
}

/** Maximum committed-change entries kept per direction. */
export const HISTORY_LIMIT = 100;

/**
 * Undo/redo stack over whole-document snapshots (memento history).
 *
 * Pure TypeScript — no Vue reactivity; the designer publishes availability
 * changes to its host through a callback instead. Every committed designer
 * mutation funnels through one notification per user gesture, so gestures
 * map 1:1 onto entries; `batchMutations` coalesces multi-mutation gestures
 * (multi-delete, paste, the architecture-settings cascade) into one entry.
 */
export class HistoryManager {
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];

  /** Publishes availability changes (canUndo/canRedo) after stack edits. */
  public onChange: (() => void) | null = null;

  /** Records the pre-mutation state and clears the redo branch. */
  public push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack.length = 0;
    this.emit();
  }

  /**
   * Moves `current` (the live state) onto the redo stack and returns the
   * most recent undo entry, or null when nothing can be undone.
   */
  public undo(current: HistoryEntry): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push(current);
    this.emit();
    return entry;
  }

  /** The redo counterpart of `undo`. */
  public redo(current: HistoryEntry): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push(current);
    this.emit();
    return entry;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Drops all history (e.g. after a project load establishes a baseline). */
  public clear(): void {
    if (this.undoStack.length === 0 && this.redoStack.length === 0) return;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.emit();
  }

  private emit(): void {
    this.onChange?.();
  }
}

/** Structural equality of two entries (no-op mutation detection). */
export function historyEntryEquals(a: HistoryEntry, b: HistoryEntry): boolean {
  return (
    a.moduleCounter === b.moduleCounter &&
    a.netCounter === b.netCounter &&
    JSON.stringify(a.modules) === JSON.stringify(b.modules) &&
    JSON.stringify(a.nets) === JSON.stringify(b.nets)
  );
}