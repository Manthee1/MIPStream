/** @format */

import Konva from 'konva';
import { Point } from './types';
import { isTextEntryTarget } from './keyboard';

export interface EventManagerOptions {
  /** Fired whenever the viewport (pan/zoom) changes. */
  onViewportChange: () => void;
  /** Fired when the host container should re-sync its size. */
  onResize: () => void;
  /**
   * True when the primary (left) button should drag-pan the viewport — the
   * Simulate perspective's viewer mode, where nothing else uses it.
   */
  canPanWithPrimary?: () => boolean;
}

/** Right-click is treated as a pan when moved beyond this threshold (px). */
const CONTEXT_MENU_THRESHOLD = 8;
/** Right-click held motionless for this long (ms) emits a context menu. */
const CONTEXT_MENU_DELAY = 180;

/** State of an in-flight viewport pan (right button, or primary in viewer mode). */
interface PanState {
  button: number;
  startClient: Point;
  startStage: Point;
}

/**
 * Owns all DOM / Konva event wiring for the schematic canvas.
 *
 * - Pan: manual right-mouse drag (works over empty canvas AND over modules,
 *   since the stage itself is never Konva-draggable; module nodes keep the
 *   default left-button Konva drag). In viewer mode — where nothing else uses
 *   the primary button — left-mouse drag pans too (`canPanWithPrimary`).
 * - Context menu: right-mouse long-press without movement.
 * - Zoom: wheel, centered on the cursor, clamped between 0.1x and 5x.
 */
export class EventManager {
  private readonly stage: Konva.Stage;
  private readonly container: HTMLElement;
  private readonly options: EventManagerOptions;

  private contextMenuTimer: number | null = null;
  private contextMenuStart: Point | null = null;
  private panState: PanState | null = null;
  private altPressed = false;

  /**
   * Tracks Alt key presses on the window. Alt is the bypass modifier for
   * strict grid alignment during module drags.
   */
  private readonly altKeyDownHandler = (event: KeyboardEvent) => {
    if (event.key !== 'Alt' || event.repeat) return;
    // Never hijack Alt while typing (special characters on some layouts).
    if (isTextEntryTarget(event.target)) return;
    // Suppress browser menu-bar focus (e.g. Firefox) on Alt press.
    event.preventDefault();
    this.altPressed = true;
  };

  private readonly altKeyUpHandler = (event: KeyboardEvent) => {
    if (event.key === 'Alt') this.altPressed = false;
  };

  private readonly blurHandler = () => {
    this.altPressed = false;
  };

  /** True while Alt is held — bypasses grid snapping during drags. */
  public isAltPressed(): boolean {
    return this.altPressed;
  }

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

  private readonly resizeHandler = () => {
    this.options.onResize();
  };

  /**
   * Observes the host container's size. Golden Layout resizes panels without
   * a window resize (splitter drags, tab collapses, undocking), so the stage
   * must track its element directly to stay correctly sized inside panels.
   */
  private resizeObserver: ResizeObserver | null = null;

  private readonly contextMenuHandler = (event: MouseEvent) => {
    if (event.button === 2) {
      event.preventDefault();
    }
  };

  private readonly mouseDownHandler = (event: MouseEvent) => {
    const primaryPan = event.button === 0 && (this.options.canPanWithPrimary?.() ?? false);
    if (event.button !== 2 && !primaryPan) return;

    this.panState = {
      button: event.button,
      startClient: { x: event.clientX, y: event.clientY },
      startStage: { x: this.stage.x(), y: this.stage.y() },
    };

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
    if (this.panState && (event.buttons & (this.panState.button === 0 ? 1 : 2)) !== 0) {
      // Button drag: pan the viewport 1:1 with the cursor.
      this.stage.position({
        x: this.panState.startStage.x + (event.clientX - this.panState.startClient.x),
        y: this.panState.startStage.y + (event.clientY - this.panState.startClient.y),
      });
      this.options.onViewportChange();
    }

    if (!this.contextMenuStart) return;

    const deltaX = Math.abs(event.clientX - this.contextMenuStart.x);
    const deltaY = Math.abs(event.clientY - this.contextMenuStart.y);

    // Movement means the user is panning, not long-pressing for a menu.
    if (deltaX > CONTEXT_MENU_THRESHOLD || deltaY > CONTEXT_MENU_THRESHOLD) {
      this.clearContextMenuTimer();
    }
  };

  private readonly mouseUpHandler = (event: MouseEvent) => {
    this.clearContextMenuTimer();
    if (this.panState !== null && event.button === this.panState.button) {
      this.panState = null;
      this.options.onViewportChange();
    }
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

    // Left button (default) stays reserved for Konva node dragging
    // (modules); the stage itself is never draggable.
    this.container.addEventListener('contextmenu', this.contextMenuHandler);
    this.container.addEventListener('mousedown', this.mouseDownHandler);
    this.container.addEventListener('mousemove', this.mouseMoveHandler);
    this.container.addEventListener('mouseup', this.mouseUpHandler);

    window.addEventListener('keydown', this.altKeyDownHandler);
    window.addEventListener('keyup', this.altKeyUpHandler);
    window.addEventListener('blur', this.blurHandler);

    this.stage.on('wheel', this.wheelHandler);

    window.addEventListener('resize', this.resizeHandler);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.resizeHandler);
      this.resizeObserver.observe(this.container);
    }
  }

  /** Unbinds all listeners. Safe to call multiple times. */
  public detach(): void {
    if (!this.attached) return;
    this.attached = false;

    this.clearContextMenuTimer();
    this.panState = null;

    this.container.removeEventListener('contextmenu', this.contextMenuHandler);
    this.container.removeEventListener('mousedown', this.mouseDownHandler);
    this.container.removeEventListener('mousemove', this.mouseMoveHandler);
    this.container.removeEventListener('mouseup', this.mouseUpHandler);

    window.removeEventListener('keydown', this.altKeyDownHandler);
    window.removeEventListener('keyup', this.altKeyUpHandler);
    window.removeEventListener('blur', this.blurHandler);

    this.stage.off('wheel', this.wheelHandler);

    window.removeEventListener('resize', this.resizeHandler);

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private clearContextMenuTimer(): void {
    if (this.contextMenuTimer !== null) {
      window.clearTimeout(this.contextMenuTimer);
      this.contextMenuTimer = null;
    }
    this.contextMenuStart = null;
  }
}
