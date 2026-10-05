/** @format */

import Konva from 'konva';
import { DesignerConfig, EditorTool, EditorMode, ViewportState, PlacementState, Point } from './types';
import { GridManager } from './grid';
import { EventManager } from './events';
import { ContextTracker, ShortcutManager } from './keyboard';
import { getManifest, hydrateModule } from '@/shared/manifestRegistry';
import type { SerializedModule, Pos } from '@/shared/types/manifest';
import { createModuleNode, setNodeSelected, nodePortWorldPosition } from './render/module-node';

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
  private readonly moduleNodes = new Map<string, Konva.Group>();
  private moduleCounter = 0;
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
    const node = this.moduleNodes.get(id);
    if (node) setNodeSelected(node, true);
    this.notifySelectionChange();
  }

  public clearSelection(): void {
    for (const id of this.selection) {
      const node = this.moduleNodes.get(id);
      if (node) setNodeSelected(node, false);
    }
    this.selection.clear();
    this.contextTracker.disable('schematic:selection');
    this.notifySelectionChange();
  }

  public getSelection(): string[] {
    return Array.from(this.selection);
  }

  /**
   * Removes every selected item. Modules are destroyed from the canvas;
   * net deletion is wired up in Stage 5.
   */
  public deleteSelected(): void {
    for (const id of Array.from(this.selection)) {
      this.removeModule(id);
    }
    this.notifySelectionChange();
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

  // ----------------------------------------------------------------- modules

  /**
   * Creates, hydrates, and renders a module instance at the given scene
   * position. The rendered body comes from the manifest's custom `render`
   * (falling back to the default port-derived body), and the ports are drawn
   * from the same hydrated port definitions used for connectivity.
   * @returns the assigned designator (e.g. "u3"), or null for an unknown typeId.
   */
  public addModule(typeId: string, position: Point, rotation = 0): string | null {
    const manifest = getManifest(typeId);
    if (!manifest) return null;

    const designator = `u${++this.moduleCounter}`;
    const serialized: SerializedModule = {
      designator,
      typeId,
      position: { x: position.x, y: position.y },
      rotation,
      config: {},
    };

    const hydrated = hydrateModule(serialized);
    const node = createModuleNode(hydrated, this.mode === 'editor' ? 'editor' : 'viewer');
    this.logicLayer.add(node);
    this.moduleNodes.set(designator, node);

    // Basic click-to-select in editor mode with the select tool active.
    node.on('click', () => {
      if (this.mode !== 'editor' || this.activeTool !== 'select') return;
      this.clearSelection();
      this.select(designator);
    });

    return designator;
  }

  /** Removes a module node from the canvas and all internal tracking. */
  public removeModule(designator: string): boolean {
    const node = this.moduleNodes.get(designator);
    if (!node) return false;

    node.destroy();
    this.moduleNodes.delete(designator);

    if (this.selection.delete(designator) && this.selection.size === 0) {
      this.contextTracker.disable('schematic:selection');
    }

    return true;
  }

  /** All module designators currently on the canvas. */
  public getModuleDesignators(): string[] {
    return Array.from(this.moduleNodes.keys());
  }

  /**
   * Scene-space position of a module port, resolved through the live Konva
   * transform so it stays correct even while the node is mid-drag.
   * Foundation for Stage 5 wire routing.
   */
  public getPortWorldPosition(designator: string, portId: string): Pos | null {
    const node = this.moduleNodes.get(designator);
    if (!node) return null;
    return nodePortWorldPosition(node, portId);
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

