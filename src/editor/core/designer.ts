/** @format */

import Konva from 'konva';
import { DesignerConfig, EditorTool, EditorMode, ViewportState, PlacementState } from './types';
import { GridManager } from './grid';
import { EventManager } from './events';
import { ContextTracker, ShortcutManager } from './keyboard';

/**
 * Orchestrator for the schematic designer canvas.
 *
 * Raw DOM/Konva event wiring lives in EventManager; context-aware keyboard
 * handling lives in ShortcutManager. This class coordinates layers, viewport
 * state, tools, selection, and placement.
 */
export class SchematicDesigner {
  private stage: Konva.Stage;
  private gridLayer: Konva.Layer;
  private logicLayer: Konva.Layer;
  private interactionLayer: Konva.Layer;

  private gridManager: GridManager;
  private eventManager: EventManager;
  private contextTracker: ContextTracker;
  private shortcutManager: ShortcutManager;

  private mode: EditorMode;
  private activeTool: EditorTool = 'select';
  private gridSize: number;

  private readonly selection = new Set<string>();
  private placement: PlacementState | null = null;

  private config: DesignerConfig;

  constructor(config: DesignerConfig) {
    this.config = config;
    this.mode = config.mode;
    this.gridSize = config.gridSize;

    this.stage = new Konva.Stage({
      container: config.container,
      width: config.container.offsetWidth,
      height: config.container.offsetHeight,
      draggable: true, // Panning is wired to the right mouse button in EventManager.
    });

    // Initialize layers
    this.gridLayer = new Konva.Layer();
    this.logicLayer = new Konva.Layer();
    this.interactionLayer = new Konva.Layer();

    this.stage.add(this.gridLayer);
    this.stage.add(this.logicLayer);
    this.stage.add(this.interactionLayer);

    this.gridManager = new GridManager(this.gridLayer, this.gridSize);

    // Event + shortcut wiring
    this.eventManager = new EventManager(this.stage, {
      onViewportChange: () => this.notifyViewportChange(),
      onResize: () => this.handleResize(),
    });
    this.contextTracker = new ContextTracker();
    this.shortcutManager = new ShortcutManager(this.contextTracker);

    this.eventManager.attach();
    if (this.mode === 'editor') {
      this.contextTracker.enable('schematic:editor');
      this.registerDefaultShortcuts();
    }
    this.shortcutManager.attach();

    this.handleResize();
  }

  // ---------------------------------------------------------------- shortcuts

  /**
   * Baseline editor keybindings. Each binding declares the contexts in which
   * it is allowed to fire (see ContextTracker / ShortcutManager).
   */
  private registerDefaultShortcuts(): void {
    // Escape: cancel placement/routing first; otherwise drop the selection.
    this.shortcutManager.register({
      key: 'escape',
      contexts: ['schematic:placing', 'schematic:routing', 'schematic:selection'],
      handler: () => {
        if (
          this.contextTracker.isActive('schematic:placing') ||
          this.contextTracker.isActive('schematic:routing')
        ) {
          this.cancelPlacement();
        } else {
          this.clearSelection();
        }
      },
    });

    // Delete / Backspace: remove the selected items.
    for (const key of ['delete', 'backspace']) {
      this.shortcutManager.register({
        key,
        contexts: ['schematic:selection'],
        handler: () => this.deleteSelected(),
      });
    }

    // R: rotate the ghost preview during placement.
    this.shortcutManager.register({
      key: 'r',
      contexts: ['schematic:placing'],
      handler: () => this.rotatePlacement(),
    });

    // Tool quick-select.
    this.shortcutManager.register({ key: 'v', contexts: ['schematic:editor'], handler: () => this.setTool('select') });
    this.shortcutManager.register({ key: 'w', contexts: ['schematic:editor'], handler: () => this.setTool('wire') });
    this.shortcutManager.register({ key: 'd', contexts: ['schematic:editor'], handler: () => this.setTool('delete') });
  }

  // ------------------------------------------------------------- tool / mode

  public setTool(tool: EditorTool): void {
    this.activeTool = tool;

    // Switching tools always abandons an in-flight placement.
    if (tool !== 'place') {
      this.cancelPlacement();
    }

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

  public getTool(): EditorTool {
    return this.activeTool;
  }

  public setMode(mode: EditorMode): void {
    this.mode = mode;
    this.stage.draggable(mode === 'editor');
  }

  // --------------------------------------------------------------- selection

  public select(id: string): void {
    this.selection.add(id);
    this.contextTracker.enable('schematic:selection');
    this.notifySelectionChange();
  }

  public clearSelection(): void {
    this.selection.clear();
    this.contextTracker.disable('schematic:selection');
    this.notifySelectionChange();
  }

  public getSelection(): string[] {
    return Array.from(this.selection);
  }

  /**
   * Removes the selected items from the design. Actual module/net removal is
   * wired up in later stages; for now it clears the selection state.
   */
  public deleteSelected(): void {
    // TODO (Stage 4/5): remove modules/nets from the document + netlist.
    this.clearSelection();
  }

  // --------------------------------------------------------------- placement

  /**
   * Enters "Select & Place" mode for the given module type. Ghost preview
   * rendering is implemented in Stage 4.
   */
  public beginPlacement(typeId: string): void {
    this.placement = { typeId, rotation: 0 };
    this.contextTracker.enable('schematic:placing');
    this.setTool('place');
    this.notifyPlacementChange();
  }

  /** Cancels the active placement preview and returns to the select tool. */
  public cancelPlacement(): void {
    if (!this.placement) return;
    this.placement = null;
    this.contextTracker.disable('schematic:placing');
    // Only revert to the select tool when placement mode was driving it;
    // otherwise the user explicitly requested a different tool.
    if (this.activeTool === 'place') {
      this.setTool('select');
    }
    this.notifyPlacementChange();
  }

  /** Rotates the placement ghost by 90-degree increments. */
  public rotatePlacement(): void {
    if (!this.placement) return;
    this.placement.rotation = (this.placement.rotation + 90) % 360;
    this.notifyPlacementChange();
  }

  public getPlacement(): PlacementState | null {
    return this.placement;
  }

  // ---------------------------------------------------------------- viewport

  public getViewportState(): ViewportState {
    return {
      x: this.stage.x(),
      y: this.stage.y(),
      zoom: this.stage.scaleX(),
    };
  }

  // --------------------------------------------------------------- lifecycle

  private handleResize(): void {
    const container = this.config.container;
    this.stage.width(container.offsetWidth);
    this.stage.height(container.offsetHeight);
  }

  private notifyViewportChange(): void {
    if (this.config.onViewportChange) {
      this.config.onViewportChange(this.getViewportState());
    }
  }

  private notifySelectionChange(): void {
    if (this.config.onSelectionChange) {
      this.config.onSelectionChange(this.getSelection());
    }
  }

  private notifyPlacementChange(): void {
    if (this.config.onPlacementChange) {
      this.config.onPlacementChange(this.placement);
    }
  }

  public destroy(): void {
    this.shortcutManager.detach();
    this.eventManager.detach();
    this.stage.destroy();
  }
}

