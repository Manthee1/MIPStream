/** @format */

export type EditorTool = 'select' | 'wire' | 'place' | 'delete';
export type EditorMode = 'viewer' | 'editor';

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface DesignerConfig {
  container: HTMLDivElement;
  mode: EditorMode;
  gridSize: number;
  onViewportChange?: (state: ViewportState) => void;
  onToolChange?: (tool: EditorTool) => void;
}

export interface Point {
  x: number;
  y: number;
}
