/** @format */

import Konva from 'konva';
import { DesignerConfig, EditorTool, EditorMode, ViewportState } from './types';
import { GridManager } from './grid';

export class SchematicDesigner {
  private stage: Konva.Stage;
  private gridLayer: Konva.Layer;
  private logicLayer: Konva.Layer;
  private interactionLayer: Konva.Layer;

  private readonly contextMenuThreshold = 8;
  private readonly contextMenuDelay = 180;
  private contextMenuTimer: number | null = null;
  private contextMenuStart: { x: number; y: number } | null = null;
  
  private gridManager: GridManager;
  private mode: EditorMode;
  private activeTool: EditorTool = 'select';
  private gridSize: number;

  private config: DesignerConfig;

  constructor(config: DesignerConfig) {
    this.config = config;
    this.mode = config.mode;
    this.gridSize = config.gridSize;

    this.stage = new Konva.Stage({
      container: config.container,
      width: config.container.offsetWidth,
      height: config.container.offsetHeight,
      draggable: true, // Enable panning by default
    });
    Konva.dragButtons = [2];

    // Initialize layers
    this.gridLayer = new Konva.Layer();
    this.logicLayer = new Konva.Layer();
    this.interactionLayer = new Konva.Layer();

    this.stage.add(this.gridLayer);
    this.stage.add(this.logicLayer);
    this.stage.add(this.interactionLayer);

    this.gridManager = new GridManager(this.gridLayer, this.gridSize);

    this.setupEventListeners();
    this.handleResize();
  }

  private setupEventListeners() {
    const container = this.stage.container();

    const handleContextMenu = (event: MouseEvent) => {
      if (event.button === 2) {
        event.preventDefault();
      }
    };

    const handleRightMouseDown = (event: MouseEvent) => {
      if (event.button !== 2) return;

      this.contextMenuStart = { x: event.clientX, y: event.clientY };
      this.contextMenuTimer = window.setTimeout(() => {
        this.contextMenuTimer = null;

        if (!this.contextMenuStart) return;

        const contextMenuEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
          buttons: 2,
          clientX: this.contextMenuStart.x,
          clientY: this.contextMenuStart.y,
        });

        container.dispatchEvent(contextMenuEvent);
        this.contextMenuStart = null;
      }, this.contextMenuDelay);
    };

    const handleRightMouseMove = (event: MouseEvent) => {
      if (event.button !== 2 || !this.contextMenuStart) return;

      const deltaX = Math.abs(event.clientX - this.contextMenuStart.x);
      const deltaY = Math.abs(event.clientY - this.contextMenuStart.y);

      if (deltaX > this.contextMenuThreshold || deltaY > this.contextMenuThreshold) {
        this.clearContextMenuTimer();
      }
    };

    const handleRightMouseUp = () => {
      this.clearContextMenuTimer();
    };

    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('mousedown', handleRightMouseDown);
    container.addEventListener('mousemove', handleRightMouseMove);
    container.addEventListener('mouseup', handleRightMouseUp);

    // Zoom logic
    this.stage.on('wheel', (e) => {
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
      
      // Clamp zoom
      const clampedScale = Math.max(0.1, Math.min(5, newScale));

      this.stage.scale({ x: clampedScale, y: clampedScale });

      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };
      this.stage.position(newPos);
      this.notifyViewportChange();
    });

    this.stage.on('dragend', () => {
      this.notifyViewportChange();
    });

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private clearContextMenuTimer() {
    if (this.contextMenuTimer !== null) {
      window.clearTimeout(this.contextMenuTimer);
      this.contextMenuTimer = null;
    }

    this.contextMenuStart = null;
  }

  private handleResize() {
    const container = this.config.container;
    this.stage.width(container.offsetWidth);
    this.stage.height(container.offsetHeight);
  }

  private notifyViewportChange() {
    if (this.config.onViewportChange) {
      this.config.onViewportChange({
        x: this.stage.x(),
        y: this.stage.y(),
        zoom: this.stage.scaleX(),
      });
    }
  }

  public setTool(tool: EditorTool) {
    this.activeTool = tool;
    if (this.config.onToolChange) {
      this.config.onToolChange(tool);
    }
    
    // Update cursor based on tool
    const container = this.stage.container();
    switch (tool) {
      case 'select': container.style.cursor = 'default'; break;
      case 'wire': container.style.cursor = 'crosshair'; break;
      case 'delete': container.style.cursor = 'not-allowed'; break;
      case 'place': container.style.cursor = 'cell'; break;
    }
  }

  public setMode(mode: EditorMode) {
    this.mode = mode;
    this.stage.draggable(mode === 'editor');
  }

  public getViewportState(): ViewportState {
    return {
      x: this.stage.x(),
      y: this.stage.y(),
      zoom: this.stage.scaleX(),
    };
  }

  public destroy() {
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.clearContextMenuTimer();
    const container = this.stage.container();
    container.removeEventListener('contextmenu', this.stage.container().oncontextmenu as EventListener);
    this.stage.destroy();
  }
}
