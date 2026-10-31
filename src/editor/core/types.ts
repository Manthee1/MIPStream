/** @format */

import type { SerializedNet } from "@/shared/types/netlist";
import type { GridSettings, ArchitectureConfiguration } from "@/shared/types/architecture";
import type { LintIssue } from "@/core/engine/lint";

export type EditorTool = 'select' | 'wire' | 'place' | 'delete';
export type EditorMode = 'viewer' | 'editor';

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

/** Active "Select & Place" preview state attached to the cursor. */
export interface PlacementState {
  /** Manifest typeId of the module being placed. */
  typeId: string;
  /** Current ghost rotation in degrees (0 | 90 | 180 | 270). */
  rotation: number;
}

export interface DesignerConfig {
  container: HTMLDivElement;
  mode: EditorMode;
  /** Initial grid settings (visibility, style, and the snapping grid size). */
  gridSettings: GridSettings;
  onViewportChange?: (state: ViewportState) => void;
  onToolChange?: (tool: EditorTool) => void;
  onSelectionChange?: (ids: string[]) => void;
  onPlacementChange?: (state: PlacementState | null) => void;
  onRoutingChange?: (active: boolean) => void;
  onNetlistChange?: (nets: SerializedNet[]) => void;
  /** Fires once per committed document mutation (modules or nets). */
  onDocumentChange?: () => void;
  /**
   * Fires after each committed change (and once after an architecture load)
   * with the fresh lint report for the Problems panel.
   */
  onProblemsChange?: (issues: LintIssue[]) => void;
  /**
   * Surfaces a user-facing error the canvas cannot express inline (e.g. why
   * a settings-managed module refuses deletion). The host maps it to a
   * toast/message; the designer itself stays UI-framework-free.
   */
  onUserError?: (message: string) => void;
  /**
   * Fires whenever the undo/redo stacks change, with fresh availability.
   * The host syncs it into the history bridge for the toolbar.
   */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  /**
   * Fires when undoing a settings batch restores a prior architecture
   * configuration alongside the document. The host must write it back
   * into the project store so the canvas and configuration stay in sync.
   */
  onConfigurationRestore?: (configuration: ArchitectureConfiguration) => void;
}

export interface Point {
  x: number;
  y: number;
}

