/** @format */

import type { SerializedNet } from "@/shared/types/netlist";
import type { GridSettings } from "@/shared/types/architecture";
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
}

export interface Point {
  x: number;
  y: number;
}

