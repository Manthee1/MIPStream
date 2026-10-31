/** @format */

import Konva from "konva";
import { pointerScenePosition } from "./pointer";
import { SceneRect } from "@/shared/utils/geometry";
import { readRenderTheme } from "./render/theme";

/** Left-drag beyond this distance (scene px) becomes a marquee instead of a click. */
const MARQUEE_DRAG_THRESHOLD = 4;

export interface MarqueeManagerOptions {
  /** Layer the marquee rect renders on (the interaction layer). */
  layer: Konva.Layer;
  /** Gates all interaction (editor mode + select tool). */
  isEnabled: () => boolean;
  /** Fired when a marquee drag completes. `additive` = Shift/Ctrl held. */
  onSelect: (rect: SceneRect, additive: boolean) => void;
  /** Fired on a left click (not drag) over empty canvas. */
  onEmptyClick: (additive: boolean) => void;
}

/**
 * Rubber-band multi-selection: a left-button drag over empty canvas (select
 * tool, editor mode) draws a dashed rectangle on the interaction layer and
 * hands the resulting scene-space rect back for hit-testing. A motionless
 * left click on empty canvas clears the selection.
 */
export class MarqueeManager {
  private readonly stage: Konva.Stage;
  private readonly layer: Konva.Layer;
  private readonly options: MarqueeManagerOptions;

  private pending: {
    start: { x: number; y: number };
    additive: boolean;
  } | null = null;
  private dragging = false;
  private rect: Konva.Rect | null = null;

  private enabled = false;

  private readonly mouseDownHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this.enabled || !this.options.isEnabled()) return;
    if (e.evt.button !== 0) return;

    // Only empty canvas starts a marquee — anything clickable intercepts first.
    const pointer = this.stage.getPointerPosition();
    if (!pointer || this.stage.getIntersection(pointer)) return;

    const scene = pointerScenePosition(this.stage);
    if (!scene) return;

    this.pending = { start: scene, additive: e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey };
  };

  private readonly mouseMoveHandler = () => {
    if (!this.pending) return;

    const scene = pointerScenePosition(this.stage);
    if (!scene) return;

    const dx = scene.x - this.pending.start.x;
    const dy = scene.y - this.pending.start.y;
    if (!this.dragging && Math.hypot(dx, dy) < MARQUEE_DRAG_THRESHOLD) return;

    if (!this.dragging) {
      this.dragging = true;
      this.rect = this.createMarqueeRect();
      this.layer.add(this.rect);
    }

    const x = Math.min(this.pending.start.x, scene.x);
    const y = Math.min(this.pending.start.y, scene.y);
    this.rect?.position({ x, y });
    this.rect?.size({ width: Math.abs(dx), height: Math.abs(dy) });
  };

  private readonly mouseUpHandler = () => {
    if (!this.pending) return;

    if (this.dragging && this.rect) {
      this.options.onSelect(
        {
          x: this.rect.x(),
          y: this.rect.y(),
          width: this.rect.width(),
          height: this.rect.height(),
        },
        this.pending.additive
      );
    } else {
      this.options.onEmptyClick(this.pending.additive);
    }

    this.cleanup();
  };

  constructor(stage: Konva.Stage, options: MarqueeManagerOptions) {
    this.stage = stage;
    this.options = options;
    this.layer = options.layer;
  }

  /** Attaches/detaches interaction handlers (select tool lifecycle). */
  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;

    if (enabled) {
      this.stage.on("mousedown", this.mouseDownHandler);
      this.stage.on("mousemove", this.mouseMoveHandler);
      window.addEventListener("mouseup", this.mouseUpHandler);
    } else {
      this.cleanup();
      this.stage.off("mousedown", this.mouseDownHandler);
      this.stage.off("mousemove", this.mouseMoveHandler);
      window.removeEventListener("mouseup", this.mouseUpHandler);
    }
  }

  /** Cancels any in-flight marquee and destroys its rect. */
  public cancel(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.pending = null;
    this.dragging = false;
    if (this.rect) {
      this.rect.destroy();
      this.rect = null;
    }
  }

  private createMarqueeRect(): Konva.Rect {
    const theme = readRenderTheme();
    return new Konva.Rect({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      // 8-digit hex: accent fill at ~12% alpha, full-opacity dashed stroke.
      fill: `${theme.accent}1f`,
      stroke: theme.accent,
      strokeWidth: 1,
      dash: [4, 3],
      listening: false,
      name: "marquee-rect",
    });
  }
}
