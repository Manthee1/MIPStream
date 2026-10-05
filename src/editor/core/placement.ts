/** @format */

import Konva from "konva";
import { Point } from "./types";
import { GridManager } from "./grid";
import { createGhostNode } from "./render/ghost";

export interface PlacementManagerOptions {
  /** Layer the ghost preview renders on (the interaction layer). */
  layer: Konva.Layer;
  gridSize: number;
  /** Stamps a module instance; returns the assigned designator or null. */
  onPlaced: (typeId: string, position: Point, rotation: number) => string | null;
  /** Placement is editor-only; gates all interaction when false. */
  isEnabled: () => boolean;
}

/**
 * "Select & Place" cursor placement engine.
 *
 * Renders a grid-snapped ghost preview attached to the cursor on the
 * interaction layer. Left-click stamps the module and stays in placement mode
 * for continuous stamping; cancel() removes the ghost and detaches handlers.
 */
export class PlacementManager {
  private readonly stage: Konva.Stage;
  private readonly layer: Konva.Layer;
  private readonly options: PlacementManagerOptions;

  private ghost: Konva.Group | null = null;
  private typeId: string | null = null;
  private rotation = 0;

  private readonly mouseMoveHandler = () => {
    if (!this.ghost) return;

    const scene = this.pointerScenePosition();
    if (!scene) return;

    this.ghost.position({
      x: GridManager.snap(scene.x, this.options.gridSize),
      y: GridManager.snap(scene.y, this.options.gridSize),
    });
    // Re-show if previously hidden by a canvas mouseleave.
    this.ghost.visible(true);
  };

  private readonly clickHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this.ghost || !this.typeId) return;
    if (!this.options.isEnabled()) return;
    // Left button only; right-button click may end a pan gesture.
    if (e.evt.button !== 0) return;

    const scene = this.pointerScenePosition();
    if (!scene) return;

    this.options.onPlaced(
      this.typeId,
      {
        x: GridManager.snap(scene.x, this.options.gridSize),
        y: GridManager.snap(scene.y, this.options.gridSize),
      },
      this.rotation
    );
  };

  private readonly mouseLeaveHandler = () => {
    if (this.ghost) this.ghost.visible(false);
  };

  private attached = false;

  constructor(stage: Konva.Stage, options: PlacementManagerOptions) {
    this.stage = stage;
    this.options = options;
    this.layer = options.layer;
  }

  /** Begins placing the given module type. Returns false if already active or unknown. */
  public begin(typeId: string): boolean {
    if (this.ghost) return false;

    const ghost = createGhostNode(typeId, 0);
    if (!ghost) return false;

    this.ghost = ghost;
    this.typeId = typeId;
    this.rotation = 0;

    ghost.position({ x: 0, y: 0 });
    ghost.visible(false); // Hidden until the cursor enters the canvas.
    this.layer.add(ghost);

    this.attach();
    return true;
  }

  /** Removes the ghost and detaches all interaction handlers. */
  public cancel(): void {
    this.detach();

    if (this.ghost) {
      this.ghost.destroy();
      this.ghost = null;
    }
    this.typeId = null;
  }

  /** Rotates the ghost by 90-degree increments; returns the new rotation. */
  public rotate(): number {
    if (!this.ghost) return this.rotation;

    this.rotation = (this.rotation + 90) % 360;
    this.ghost.rotation(this.rotation);
    return this.rotation;
  }

  public isActive(): boolean {
    return this.ghost !== null;
  }

  public getTypeId(): string | null {
    return this.typeId;
  }

  public getRotation(): number {
    return this.rotation;
  }

  private attach(): void {
    if (this.attached) return;
    this.attached = true;

    this.stage.on("mousemove", this.mouseMoveHandler);
    this.stage.on("click", this.clickHandler);
    this.stage.on("mouseleave", this.mouseLeaveHandler);
  }

  private detach(): void {
    if (!this.attached) return;
    this.attached = false;

    this.stage.off("mousemove", this.mouseMoveHandler);
    this.stage.off("click", this.clickHandler);
    this.stage.off("mouseleave", this.mouseLeaveHandler);
  }

  /** Container-relative pointer position converted to scene coordinates. */
  private pointerScenePosition(): Point | null {
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return null;

    const scale = this.stage.scaleX();
    return {
      x: (pointer.x - this.stage.x()) / scale,
      y: (pointer.y - this.stage.y()) / scale,
    };
  }
}
