/** @format */

import Konva from 'konva';

export class GridManager {
  private layer: Konva.Layer;
  private gridSize: number;
  private gridGroup: Konva.Group;

  constructor(layer: Konva.Layer, gridSize: number) {
    this.layer = layer;
    this.gridSize = gridSize;
    this.gridGroup = new Konva.Group({ listening: false });
    this.layer.add(this.gridGroup);
    this.drawGrid();
  }

  /**
   * Draws a grid that covers the visible area.
   * For simplicity and performance, we draw a large area or use a pattern.
   * Here we draw lines based on viewport but we'll optimize it later with a rect pattern if needed.
   */
  public drawGrid() {
    this.gridGroup.destroyChildren();
    
    // We'll draw a large grid area for now. 
    // In a production CAD, we'd only draw visible lines or use a Pattern Fill.
    const size = 10000;
    const offset = size / 2;

    for (let i = 0; i <= size; i += this.gridSize) {
      // Vertical
      this.gridGroup.add(new Konva.Line({
        points: [i - offset, -offset, i - offset, offset],
        stroke: '#334155',
        strokeWidth: 0.5,
        opacity: 0.2,
      }));
      // Horizontal
      this.gridGroup.add(new Konva.Line({
        points: [-offset, i - offset, offset, i - offset],
        stroke: '#334155',
        strokeWidth: 0.5,
        opacity: 0.2,
      }));
    }
  }

  public static snap(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
  }

  public snapPoint(x: number, y: number): { x: number, y: number } {
    return {
      x: GridManager.snap(x, this.gridSize),
      y: GridManager.snap(y, this.gridSize)
    };
  }
}
