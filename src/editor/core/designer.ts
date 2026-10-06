/** @format */

import Konva from 'konva';
import { DesignerConfig, EditorTool, EditorMode, ViewportState, PlacementState, Point } from './types';
import { GridManager } from './grid';
import { EventManager } from './events';
import { ContextTracker, ShortcutManager } from './keyboard';
import { PlacementManager } from './placement';
import { setPlacementListener } from './placement-bridge';
import { RoutingManager } from './routing';
import { getManifest, hydrateModule } from '@/shared/manifestRegistry';
import type { SerializedModule, Pos, PortDefinition, HydratedModule } from '@/shared/types/manifest';
import type { NetEndpoint, SerializedNet } from '@/shared/types/netlist';
import { isSameEndpoint, netDrivingInput } from '@/shared/utils/netlist';
import { composeNetPath } from './render/orthogonal-path';
import { createWireNode, updateWireNode, setWireSelected } from './render/wire';
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
  private placementManager: PlacementManager;
  private routingManager: RoutingManager;

  private mode: EditorMode;
  private activeTool: EditorTool = 'select';
  private gridSize: number;

  private readonly selection = new Set<string>();
  private readonly moduleNodes = new Map<string, Konva.Group>();
  private readonly hydratedModules = new Map<string, HydratedModule>();
  private moduleCounter = 0;
  private readonly nets = new Map<string, SerializedNet>();
  private readonly wireNodes = new Map<string, Konva.Line>();
  private netCounter = 0;
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

    // "Select & Place" engine: ghost preview + stamping on the interaction layer.
    this.placementManager = new PlacementManager(this.stage, {
      layer: this.interactionLayer,
      gridSize: this.gridSize,
      onPlaced: (typeId, position, rotation) => this.addModule(typeId, position, rotation),
      isEnabled: () => this.mode === 'editor',
    });

    // Interactive net routing: port hit-testing, waypoint previews, commits.
    this.routingManager = new RoutingManager(this.stage, {
      layer: this.interactionLayer,
      gridSize: this.gridSize,
      getPortPosition: (designator, portId) => this.getPortWorldPosition(designator, portId),
      onCommit: (start, waypoints, end) => this.addNet(start, waypoints, end),
      onRoutingChange: (active) => {
        if (active) {
          this.contextTracker.enable('schematic:routing');
        } else {
          this.contextTracker.disable('schematic:routing');
        }
        this.notifyRoutingChange();
      },
      isEnabled: () => this.mode === 'editor',
    });

    if (this.mode === 'editor') {
      this.contextTracker.enable('schematic:editor');
      this.registerDefaultShortcuts();
      // Palette panels reach the designer through the placement bridge.
      setPlacementListener((typeId) => this.beginPlacement(typeId));
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
        if (this.contextTracker.isActive('schematic:routing')) {
          this.routingManager.cancel();
        } else if (this.contextTracker.isActive('schematic:placing')) {
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

    // Net routing is active only while the wire tool is selected.
    this.routingManager.setEnabled(tool === 'wire');
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

    const wire = this.wireNodes.get(id);
    if (wire) setWireSelected(wire, true);

    this.notifySelectionChange();
  }

  public clearSelection(): void {
    for (const id of this.selection) {
      const node = this.moduleNodes.get(id);
      if (node) setNodeSelected(node, false);

      const wire = this.wireNodes.get(id);
      if (wire) setWireSelected(wire, false);
    }
    this.selection.clear();
    this.contextTracker.disable('schematic:selection');
    this.notifySelectionChange();
  }

  public getSelection(): string[] {
    return Array.from(this.selection);
  }

  /**
   * Removes every selected item. Selection entries may be module designators
   * ("u*") or net ids ("n*"); nets are removed when the entry is not a module.
   */
  public deleteSelected(): void {
    for (const id of Array.from(this.selection)) {
      if (!this.removeModule(id)) {
        this.removeNet(id);
      }
    }
    this.notifySelectionChange();
  }

  // --------------------------------------------------------------- placement

  /**
   * Enters "Select & Place" mode for the given module type. A grid-snapped
   * ghost preview attaches to the cursor; left-click stamps instances
   * continuously until cancelled. Clicking a different palette item swaps
   * the ghost type.
   */
  public beginPlacement(typeId: string): void {
    // Drop any in-flight placement so a new type can take over.
    if (this.placement) this.cancelPlacement();
    if (!this.placementManager.begin(typeId)) return;

    this.placement = { typeId, rotation: 0 };
    this.contextTracker.enable('schematic:placing');
    this.setTool('place');
    this.notifyPlacementChange();
  }

  /** Cancels the active placement preview and returns to the select tool. */
  public cancelPlacement(): void {
    if (!this.placement) return;
    this.placementManager.cancel();
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
    this.placement.rotation = this.placementManager.rotate();
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
    this.hydratedModules.set(designator, hydrated);

    // Basic click-to-select in editor mode with the select tool active.
    node.on('click', () => {
      if (this.mode !== 'editor' || this.activeTool !== 'select') return;
      this.clearSelection();
      this.select(designator);
    });

    // Keep attached wires glued to their ports while the module is dragged.
    node.on('dragmove', () => this.rerenderNetsForDesignator(designator));

    return designator;
  }

  /** Removes a module node from the canvas and all internal tracking. */
  public removeModule(designator: string): boolean {
    const node = this.moduleNodes.get(designator);
    if (!node) return false;

    // Attached nets dangle without their module: remove them first.
    for (const net of this.allNets()) {
      const attached =
        net.source.designator === designator ||
        net.targets.some((target) => target.designator === designator);
      if (attached) this.removeNet(net.id);
    }

    node.destroy();
    this.moduleNodes.delete(designator);
    this.hydratedModules.delete(designator);

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

  // -------------------------------------------------------------------- nets

  /**
   * Validates and commits a net between two module ports. The net is oriented
   * so the source is always the output port. Rejects invalid connections:
   * unknown ports, output-to-output, input-to-input, the same port twice, or
   * an input that is already driven (one driver per input).
   */
  public addNet(start: NetEndpoint, waypoints: Pos[], end: NetEndpoint): boolean {
    const startPort = this.resolvePort(start);
    const endPort = this.resolvePort(end);
    if (!startPort || !endPort) return false;

    // Orient so the source is the output side; reject mismatched directions.
    let source = start;
    let target = end;
    if (startPort.direction === 'input' && endPort.direction === 'output') {
      source = end;
      target = start;
    } else if (startPort.direction !== 'output' || endPort.direction !== 'input') {
      return false;
    }

    if (isSameEndpoint(source, target)) return false;
    if (netDrivingInput(this.allNets(), target)) return false;

    const sourcePos = this.getPortWorldPosition(source.designator, source.portId);
    const targetPos = this.getPortWorldPosition(target.designator, target.portId);
    if (!sourcePos || !targetPos) return false;

    const net: SerializedNet = {
      id: `n${++this.netCounter}`,
      source,
      targets: [target],
    };
    if (waypoints.length > 0) net.waypoints = waypoints;

    const wire = createWireNode(net.id, composeNetPath(sourcePos, waypoints, targetPos));
    this.logicLayer.add(wire);
    this.nets.set(net.id, net);
    this.wireNodes.set(net.id, wire);

    wire.on('click', () => {
      if (this.mode !== 'editor' || this.activeTool !== 'select') return;
      this.clearSelection();
      this.select(net.id);
    });

    this.notifyNetlistChange();
    return true;
  }

  /** Removes a net wire from the canvas and the netlist. */
  public removeNet(id: string): boolean {
    const wire = this.wireNodes.get(id);
    if (!wire) return false;

    wire.destroy();
    this.wireNodes.delete(id);
    this.nets.delete(id);

    if (this.selection.delete(id) && this.selection.size === 0) {
      this.contextTracker.disable('schematic:selection');
    }

    this.notifyNetlistChange();
    return true;
  }

  /** All committed nets, in creation order. */
  public getNets(): SerializedNet[] {
    return this.allNets();
  }

  /** Recomputes every wire attached to a module; called during node drag. */
  private rerenderNetsForDesignator(designator: string): void {
    for (const net of this.nets.values()) {
      const attached =
        net.source.designator === designator ||
        net.targets.some((target) => target.designator === designator);
      if (!attached) continue;

      const wire = this.wireNodes.get(net.id);
      if (!wire) continue;

      const sourcePos = this.getPortWorldPosition(net.source.designator, net.source.portId);
      const target = net.targets[0];
      if (!target) continue;
      const targetPos = this.getPortWorldPosition(target.designator, target.portId);
      if (!sourcePos || !targetPos) continue;

      updateWireNode(wire, composeNetPath(sourcePos, net.waypoints ?? [], targetPos));
    }
  }

  /** Resolves a net endpoint against its hydrated module's port definition. */
  private resolvePort(endpoint: NetEndpoint): PortDefinition | null {
    const hydrated = this.hydratedModules.get(endpoint.designator);
    if (!hydrated) return null;
    return hydrated.ports.find((port) => port.id === endpoint.portId) ?? null;
  }

  private allNets(): SerializedNet[] {
    return Array.from(this.nets.values());
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

  private notifyRoutingChange(): void {
    if (this.config.onRoutingChange) {
      this.config.onRoutingChange(this.contextTracker.isActive('schematic:routing'));
    }
  }

  private notifyNetlistChange(): void {
    if (this.config.onNetlistChange) {
      this.config.onNetlistChange(this.allNets());
    }
  }

  public destroy(): void {
    setPlacementListener(null);
    this.routingManager.setEnabled(false);
    this.placementManager.cancel();
    this.shortcutManager.detach();
    this.eventManager.detach();
    this.stage.destroy();
  }
}

