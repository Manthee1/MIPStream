/** @format */

import Konva from 'konva';
import { Point } from './types';

export interface EventManagerOptions {
  /** Fired whenever the viewport (pan/zoom) changes. */
  onViewportChange: () => void;
  /** Fired when the host container should re-sync its size. */
  onResize: () => void;
}

/** Right-click is treated as a drag when moved beyond this threshold (px). */
const CONTEXT_MENU_THRESHOLD = 8;
/** Right-click held motionless for this long (ms) emits a context menu. */
const CONTEXT_MENU_DELAY = 180;

/**
 * Owns all DOM / Konva event wiring for the schematic canvas.
 *
 * - Pan: right-mouse drag (via Konva.dragButtons = [2]).
 * - Context menu: right-mouse long-press without movement.
 * - Zoom: wheel, centered on the cursor, clamped between 0.1x and 5x.
 */
export class EventManager {
  private readonly stage: Konva.Stage;
  private readonly container: HTMLElement;
  private readonly options: EventManagerOptions;

  private contextMenuTimer: number | null = null;
  private contextMenuStart: Point | null = null;

  private readonly wheelHandler = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const scaleBy = 1.1;
    const oldScale = this.stage.scaleX();
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - this.stage.x()) / oldScale,
      y: (pointer.y - this.stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    this.stage.scale({ x: clampedScale, y: clampedScale });
    this.stage.position({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });

    this.options.onViewportChange();
  };

  private readonly dragEndHandler = () => {
    this.options.onViewportChange();
  };

  private readonly resizeHandler = () => {
    this.options.onResize();
  };

  private readonly contextMenuHandler = (event: MouseEvent) => {
    if (event.button === 2) {
      event.preventDefault();
    }
  };

  private readonly mouseDownHandler = (event: MouseEvent) => {
    if (event.button !== 2) return;

    this.contextMenuStart = { x: event.clientX, y: event.clientY };
    this.contextMenuTimer = window.setTimeout(() => {
      this.contextMenuTimer = null;

      if (!this.contextMenuStart) return;

      // Held motionless: dispatch a synthetic context menu at the press point.
      const syntheticEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        buttons: 2,
        clientX: this.contextMenuStart.x,
        clientY: this.contextMenuStart.y,
      });

      this.container.dispatchEvent(syntheticEvent);
      this.contextMenuStart = null;
    }, CONTEXT_MENU_DELAY);
  };

  private readonly mouseMoveHandler = (event: MouseEvent) => {
    if (event.button !== 2 || !this.contextMenuStart) return;

    const deltaX = Math.abs(event.clientX - this.contextMenuStart.x);
    const deltaY = Math.abs(event.clientY - this.contextMenuStart.y);

    // Movement means the user is panning, not long-pressing for a menu.
    if (deltaX > CONTEXT_MENU_THRESHOLD || deltaY > CONTEXT_MENU_THRESHOLD) {
      this.clearContextMenuTimer();
    }
  };

  private readonly mouseUpHandler = () => {
    this.clearContextMenuTimer();
  };

  private attached = false;

  constructor(stage: Konva.Stage, options: EventManagerOptions) {
    this.stage = stage;
    this.container = stage.container();
    this.options = options;
  }

  /** Binds all canvas-level event listeners. Idempotent. */
  public attach(): void {
    if (this.attached) return;
    this.attached = true;

    // Route Konva dragging through the right mouse button (pan).
    Konva.dragButtons = [2];

    this.container.addEventListener('contextmenu', this.contextMenuHandler);
    this.container.addEventListener('mousedown', this.mouseDownHandler);
    this.container.addEventListener('mousemove', this.mouseMoveHandler);
    this.container.addEventListener('mouseup', this.mouseUpHandler);

    this.stage.on('wheel', this.wheelHandler);
    this.stage.on('dragend', this.dragEndHandler);

    window.addEventListener('resize', this.resizeHandler);
  }

  /** Unbinds all listeners. Safe to call multiple times. */
  public detach(): void {
    if (!this.attached) return;
    this.attached = false;

    this.clearContextMenuTimer();

    this.container.removeEventListener('contextmenu', this.contextMenuHandler);
    this.container.removeEventListener('mousedown', this.mouseDownHandler);
    this.container.removeEventListener('mousemove', this.mouseMoveHandler);
    this.container.removeEventListener('mouseup', this.mouseUpHandler);

    this.stage.off('wheel', this.wheelHandler);
    this.stage.off('dragend', this.dragEndHandler);

    window.removeEventListener('resize', this.resizeHandler);
  }

  private clearContextMenuTimer(): void {
    if (this.contextMenuTimer !== null) {
      window.clearTimeout(this.contextMenuTimer);
      this.contextMenuTimer = null;
    }
    this.contextMenuStart = null;
  }
}
