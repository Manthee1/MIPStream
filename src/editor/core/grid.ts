/** @format */

import Konva from 'konva';
import { readRenderTheme } from './render/theme';

export interface GridRenderSettings {
  /** Master visibility toggle — independent of the render style. */
  show: boolean;
  /** Render style when shown: orthogonal lines or a dot lattice. */
  style: 'lines' | 'dots';
  /** Base grid size in scene units; also drives placement/movement snapping. */
  size: number;
}

/** Below this on-screen spacing (px), a grid level promotes to a coarser one. */
const MIN_LEVEL_SPACING_PX = 8;
/** Coarser level multiplier — the KiCad-style fine + coarse grid pair. */
const MAJOR_MULTIPLE = 5;

/**
 * Adaptive multi-level grid renderer.
 *
 * Draws two grid levels over the visible viewport only: the fine level (the
 * base grid, promoted while too dense on screen) plus a coarser, more
 * pronounced major level on top of it. Zooming far out hides the fine
 * squares entirely — only the coarse ones remain, like KiCad's grid.
 */
export class GridManager {
  private readonly layer: Konva.Layer;
  private readonly gridGroup: Konva.Group;
  private settings: GridRenderSettings;
  /** The currently visible grid increment (snapped to the promoted level). */
  private currentVisualStep: number;

  constructor(layer: Konva.Layer, settings: GridRenderSettings) {
    this.layer = layer;
    this.settings = settings;
    this.currentVisualStep = settings.size;
    this.gridGroup = new Konva.Group({ listening: false });
    this.layer.add(this.gridGroup);
  }

  /** Applies new grid settings and redraws immediately. */
  public applySettings(settings: GridRenderSettings): void {
    this.settings = settings;
    this.currentVisualStep = settings.size;
    this.render();
  }

  /** Current grid settings. */
  public getSettings(): GridRenderSettings {
    return this.settings;
  }

  /** The currently visible snapping increment (matches visual grid density). */
  public getVisualStep(): number {
    return this.currentVisualStep;
  }

  /**
   * Redraws the grid for the current viewport: one fine and one coarse
   * level, covering exactly the visible scene rectangle.
   */
  public render(): void {
    this.gridGroup.destroyChildren();

    if (!this.settings.show || this.settings.size <= 0) {
      this.currentVisualStep = this.settings.size;
      return;
    }

    const stage = this.layer.getStage();
    if (!stage || stage.width() === 0 || stage.height() === 0) return;

    const scale = stage.scaleX() || 1;
    // The visible scene rectangle: grid children are drawn in scene space and
    // the stage transform maps them onto the viewport.
    const view = {
      x: -stage.x() / scale,
      y: -stage.y() / scale,
      width: stage.width() / scale,
      height: stage.height() / scale,
    };

    // Promote the fine level while its on-screen spacing becomes too dense.
    let minorStep = this.settings.size;
    while (minorStep * scale < MIN_LEVEL_SPACING_PX) {
      minorStep *= MAJOR_MULTIPLE;
    }
    this.currentVisualStep = minorStep;
    const majorStep = minorStep * MAJOR_MULTIPLE;

    const color = readRenderTheme().bodyStroke;

    // Render minor grid first (subtle), then major grid on top (pronounced).
    this.drawLevel(view, scale, minorStep, color, 0.15, 0.8, false);
    this.drawLevel(view, scale, majorStep, color, 0.5, 1.6, true);
  }

  /** Draws one grid level across the visible rectangle. */
  private drawLevel(
    view: { x: number; y: number; width: number; height: number },
    scale: number,
    step: number,
    color: string,
    opacity: number,
    strokeWidthPx: number,
    isMajor: boolean
  ): void {
    const startX = Math.floor(view.x / step) * step;
    const endX = view.x + view.width;
    const startY = Math.floor(view.y / step) * step;
    const endY = view.y + view.height;

    if (this.settings.style === 'dots') {
      // Radii divided by scale so dots stay ~constant on screen.
      const radius = (isMajor ? 1.8 : 1) / scale;
      for (let x = startX; x <= endX; x += step) {
        for (let y = startY; y <= endY; y += step) {
          this.gridGroup.add(
            new Konva.Circle({ x, y, radius, fill: color, opacity, listening: false })
          );
        }
      }
      return;
    }

    const strokeWidth = strokeWidthPx / scale; // keep ~constant on screen
    for (let x = startX; x <= endX; x += step) {
      this.gridGroup.add(
        new Konva.Line({
          points: [x, view.y, x, view.y + view.height],
          stroke: color,
          strokeWidth,
          opacity,
          listening: false,
        })
      );
    }
    for (let y = startY; y <= endY; y += step) {
      this.gridGroup.add(
        new Konva.Line({
          points: [view.x, y, view.x + view.width, y],
          stroke: color,
          strokeWidth,
          opacity,
          listening: false,
        })
      );
    }
  }

  public static snap(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
  }

  public snapPoint(x: number, y: number): { x: number, y: number } {
    return {
      x: GridManager.snap(x, this.settings.size),
      y: GridManager.snap(y, this.settings.size)
    };
  }
}
