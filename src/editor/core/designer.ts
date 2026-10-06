/** @format */

import Konva from 'konva';
import { DesignerConfig, EditorTool, EditorMode, ViewportState, PlacementState, Point } from './types';
import { GridManager } from './grid';
import { EventManager } from './events';
import { ContextTracker, ShortcutManager } from './keyboard';
import { PlacementManager } from './placement';
import {
  setPlacementListener,
  setPlacementCancelListener,
  pendingPlacementTypeId,
} from './placement-bridge';
import { RoutingManager, RoutePoint } from './routing';
import { MarqueeManager } from './selection';
import { WireDragManager, NetGeometry } from './wire-drag';
import { getManifest, hydrateModule } from '@/shared/manifestRegistry';
import type { SerializedModule, Pos, PortDefinition, HydratedModule } from '@/shared/types/manifest';
import type { NetEndpoint, SerializedNet, NetBranch } from '@/shared/types/netlist';
import { isSameEndpoint, netDrivingInput } from '@/shared/utils/netlist';
import type { GridSettings } from '@/shared/types/architecture';
import { closestPointOnPolyline, rectsIntersect, SceneRect } from '@/shared/utils/geometry';
import { composeNetPath } from './render/orthogonal-path';
import {
  createWireNode,
  updateWireNode,
  setWireSelected,
  setWireHover,
  setWireValidHighlight,
  setWireDangerHover,
  createWaypointHandle,
  removeWaypointHandles,
  getWaypointHandlePosition,
  setWaypointHandlePosition,
  BranchGeometry,
} from './render/wire';
import {
  createModuleNode,
  setNodeSelected,
  setNodeDangerHover,
  setPortHighlighted,
  nodePortWorldPosition,
} from './render/module-node';

/**
 * Orchestrator for the schematic designer canvas.
 *
 * Raw DOM/Konva event wiring lives in EventManager; context-aware keyboard
 * handling lives in ShortcutManager; marquee selection in MarqueeManager;
 * wire segment dragging in WireDragManager; and interactive routing in
 * RoutingManager. This class coordinates layers, viewport state, tools,
 * selection, placement, and the netlist.
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
  private marqueeManager: MarqueeManager;
  private wireDragManager: WireDragManager;

  private mode: EditorMode;
  private activeTool: EditorTool = 'select';
  private gridSettings: GridSettings;

  private readonly selection = new Set<string>();
  private readonly moduleNodes = new Map<string, Konva.Group>();
  private readonly hydratedModules = new Map<string, HydratedModule>();
  private moduleCounter = 0;
  private readonly nets = new Map<string, SerializedNet>();
  private readonly wireNodes = new Map<string, Konva.Group>();
  private netCounter = 0;
  private placement: PlacementState | null = null;

  /** Position snapshot of a multi-selected module group while dragging. */
  private dragSnapshot: Map<string, Point> | null = null;

  /** Ports highlighted as valid route targets (designator:portId keys). */
  private readonly routeHighlightedPorts = new Set<string>();
  /** Nets highlighted as valid route targets. */
  private readonly routeHighlightedNets = new Set<string>();

  private config: DesignerConfig;

  constructor(config: DesignerConfig) {
    this.config = config;
    this.mode = config.mode;
    this.gridSettings = config.gridSettings;

    // The stage itself is never Konva-draggable: panning is a manual
    // right-button drag (EventManager), leaving the left button free for
    // module drags and marquee selection.
    this.stage = new Konva.Stage({
      container: config.container,
      width: config.container.offsetWidth,
      height: config.container.offsetHeight,
    });

    // Initialize layers
    this.gridLayer = new Konva.Layer();
    this.logicLayer = new Konva.Layer();
    this.interactionLayer = new Konva.Layer();

    this.stage.add(this.gridLayer);
    this.stage.add(this.logicLayer);
    this.stage.add(this.interactionLayer);

    this.gridManager = new GridManager(this.gridLayer, this.gridSettings);

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
      getGridSize: () => this.getGridSize(),
      onPlaced: (typeId, position, rotation) => this.addModule(typeId, position, rotation),
      isEnabled: () => this.mode === 'editor',
    });

    // Rubber-band multi-selection over empty canvas (select tool).
    this.marqueeManager = new MarqueeManager(this.stage, {
      layer: this.interactionLayer,
      isEnabled: () => this.mode === 'editor' && this.activeTool === 'select',
      onSelect: (rect, additive) => this.selectInRect(rect, additive),
      onEmptyClick: (additive) => {
        if (!additive) this.clearSelection();
      },
    });

    // KiCad-style wire segment dragging (select tool).
    this.wireDragManager = new WireDragManager(this.stage, {
      getGridSize: () => this.getGridSize(),
      getNet: (netId) => this.nets.get(netId) ?? null,
      getNetGeometry: (netId) => this.getNetGeometry(netId),
      onDragUpdate: (netId, draft) => this.recomposeNet(draft),
      onDragCommit: (netId, draft) => this.commitWireDrag(netId, draft),
      isEnabled: () => this.mode === 'editor' && this.activeTool === 'select',
    });

    // Interactive net routing: port/wire hit-testing, waypoint previews,
    // junction taps, and connectable-target highlighting.
    this.routingManager = new RoutingManager(this.stage, {
      layer: this.interactionLayer,
      getGridSize: () => this.getGridSize(),
      getPortPosition: (designator, portId) => this.getPortWorldPosition(designator, portId),
      getNetJunction: (netId, scene) => this.getNetJunction(netId, scene),
      onCommit: (start, waypoints, end) => this.addRoute(start, waypoints, end),
      onRoutingChange: (active) => {
        if (active) {
          this.contextTracker.enable('schematic:routing');
        } else {
          this.contextTracker.disable('schematic:routing');
        }
        this.notifyRoutingChange();
      },
      onRouteStart: (start) => this.applyRouteHighlights(start),
      onRouteEnd: () => this.clearRouteHighlights(),
      setPortHover: (endpoint, hovered) => this.setPortHoverState(endpoint, hovered),
      isEnabled: () => this.mode === 'editor',
    });

    if (this.mode === 'editor') {
      this.contextTracker.enable('schematic:editor');
      this.registerDefaultShortcuts();
      // Palette panels reach the designer through the placement bridge.
      setPlacementListener((typeId) => this.beginPlacement(typeId));
      setPlacementCancelListener(() => this.cancelPlacement());
    }
    this.shortcutManager.attach();

    // Activate the default tool so its interaction managers (marquee, wire
    // dragging) attach immediately instead of waiting for the first switch.
    this.setTool('select');

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

    this.updateCursor();

    // Interaction managers follow the active tool (mode-gated internally).
    const selectActive = this.mode === 'editor' && tool === 'select';
    this.marqueeManager.setEnabled(selectActive);
    this.wireDragManager.setEnabled(selectActive);
    // Net routing is active only while the wire tool is selected.
    this.routingManager.setEnabled(tool === 'wire');
  }

  public getTool(): EditorTool {
    return this.activeTool;
  }

  public setMode(mode: EditorMode): void {
    this.mode = mode;
    // Re-applies tool gating (managers check the new mode).
    this.setTool(this.activeTool);
  }

  // ----------------------------------------------------------------- cursors

  private updateCursor(): void {
    this.stage.container().style.cursor = this.toolCursor(this.activeTool);
  }

  private setCursor(cursor: string): void {
    this.stage.container().style.cursor = cursor;
  }

  private toolCursor(tool: EditorTool): string {
    switch (tool) {
      case 'wire': return 'crosshair';
      case 'delete': return 'crosshair';
      case 'place': return 'cell';
      default: return 'default';
    }
  }

  // --------------------------------------------------------------- selection

  public select(id: string): void {
    this.selection.add(id);
    this.contextTracker.enable('schematic:selection');

    const node = this.moduleNodes.get(id);
    if (node) setNodeSelected(node, true);

    const wire = this.wireNodes.get(id);
    if (wire) {
      setWireSelected(wire, true);
      this.showWireHandles(id);
    }

    this.notifySelectionChange();
  }

  /** Shift-click behavior: adds the id, or removes it when already selected. */
  public toggleSelection(id: string): void {
    if (this.selection.has(id)) {
      this.deselect(id);
    } else {
      this.select(id);
    }
  }

  private deselect(id: string): void {
    if (!this.selection.delete(id)) return;

    const node = this.moduleNodes.get(id);
    if (node) setNodeSelected(node, false);

    const wire = this.wireNodes.get(id);
    if (wire) {
      setWireSelected(wire, false);
      removeWaypointHandles(wire);
    }

    if (this.selection.size === 0) {
      this.contextTracker.disable('schematic:selection');
    }
    this.notifySelectionChange();
  }

  public clearSelection(): void {
    for (const id of Array.from(this.selection)) {
      this.deselect(id);
    }
  }

  public getSelection(): string[] {
    return Array.from(this.selection);
  }

  /** Selects every module and wire intersecting a marquee rect. */
  public selectInRect(rect: SceneRect, additive: boolean): void {
    if (!additive) this.clearSelection();

    const hits: string[] = [];
    for (const [id, node] of this.moduleNodes) {
      const bounds = node.getClientRect({ relativeTo: this.logicLayer });
      if (rectsIntersect(bounds, rect)) hits.push(id);
    }
    for (const [id, wire] of this.wireNodes) {
      const bounds = wire.getClientRect({ relativeTo: this.logicLayer });
      if (rectsIntersect(bounds, rect)) hits.push(id);
    }

    for (const id of hits) this.select(id);
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
    pendingPlacementTypeId.value = typeId;
    this.contextTracker.enable('schematic:placing');
    this.setTool('place');
    this.notifyPlacementChange();
  }

  /** Cancels the active placement preview and returns to the select tool. */
  public cancelPlacement(): void {
    if (!this.placement) return;
    this.placementManager.cancel();
    this.placement = null;
    pendingPlacementTypeId.value = null;
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

    this.attachModuleInteractions(node, designator);

    return designator;
  }

  /** Wires up hover, click, and drag interactions for a module node. */
  private attachModuleInteractions(node: Konva.Group, designator: string): void {
    node.on('mouseenter', () => {
      if (this.mode !== 'editor') return;
      if (this.activeTool === 'delete') {
        setNodeDangerHover(node, true);
        this.setCursor('crosshair');
      } else if (this.activeTool === 'select') {
        this.setCursor('move');
      }
    });

    node.on('mouseleave', () => {
      if (this.mode !== 'editor') return;
      if (this.activeTool === 'delete') {
        setNodeDangerHover(node, false);
        setNodeSelected(node, this.selection.has(designator));
      }
      this.updateCursor();
    });

    node.on('click', (e) => {
      if (this.mode !== 'editor') return;
      if (this.activeTool === 'delete') {
        this.removeModule(designator);
        return;
      }
      if (this.activeTool !== 'select') return;
      if (e.evt.shiftKey) {
        this.toggleSelection(designator);
      } else {
        this.clearSelection();
        this.select(designator);
      }
    });

    // Group drag: dragging a selected module moves the whole selection.
    node.on('dragstart', () => {
      if (this.mode !== 'editor') return;
      if (!this.selection.has(designator) || this.selection.size < 2) return;

      this.dragSnapshot = new Map();
      for (const id of this.selection) {
        const other = this.moduleNodes.get(id);
        if (other) this.dragSnapshot.set(id, { x: other.x(), y: other.y() });
      }
    });

    node.on('dragmove', () => {
      // Strict grid alignment while moving; hold Alt for free placement.
      if (!this.eventManager.isAltPressed()) {
        node.position({
          x: GridManager.snap(node.x(), this.getGridSize()),
          y: GridManager.snap(node.y(), this.getGridSize()),
        });
      }

      const origin = this.dragSnapshot?.get(designator);
      if (this.dragSnapshot && origin) {
        const dx = node.x() - origin.x;
        const dy = node.y() - origin.y;
        for (const [id, start] of this.dragSnapshot) {
          if (id === designator) continue;
          const other = this.moduleNodes.get(id);
          if (!other) continue;
          other.position({ x: start.x + dx, y: start.y + dy });
          this.rerenderNetsForDesignator(id);
        }
      }
      // Keep attached wires glued to their ports while the module is dragged.
      this.rerenderNetsForDesignator(designator);
    });

    node.on('dragend', () => {
      if (this.dragSnapshot) {
        for (const id of this.dragSnapshot.keys()) this.commitModulePosition(id);
        this.dragSnapshot = null;
      } else {
        this.commitModulePosition(designator);
      }
    });
  }

  /** Syncs a module's committed position with its live Konva transform. */
  private commitModulePosition(designator: string): void {
    const node = this.moduleNodes.get(designator);
    const hydrated = this.hydratedModules.get(designator);
    if (!node || !hydrated) return;
    hydrated.position = { x: node.x(), y: node.y() };
  }

  /** Removes a module node from the canvas and all internal tracking. */
  public removeModule(designator: string): boolean {
    const node = this.moduleNodes.get(designator);
    if (!node) return false;

    // Prune the module's endpoints from attached nets. A net survives when
    // its driver and at least one other target remain; only the wire leading
    // to the removed module is discarded ("wires until a junction").
    for (const net of this.allNets()) {
      this.pruneNetForRemovedModule(net, designator);
    }

    node.destroy();
    this.moduleNodes.delete(designator);
    this.hydratedModules.delete(designator);

    if (this.selection.delete(designator) && this.selection.size === 0) {
      this.contextTracker.disable('schematic:selection');
    }

    return true;
  }

  /**
   * Removes a deleted module's endpoints from an attached net. The net dies
   * only when the module hosted its driver, or when no targets remain. A
   * surviving net keeps its trunk and remaining branches: the wire to a
   * removed target is trimmed, and when the trunk endpoint (targets[0]) is
   * gone the next target is promoted onto the trunk (its old branch is
   * discarded, since the trunk itself now routes to that port).
   */
  private pruneNetForRemovedModule(net: SerializedNet, designator: string): void {
    if (net.source.designator === designator) {
      // The driver is gone: nothing can keep the net alive.
      this.removeNet(net.id);
      return;
    }

    const survivors = net.targets.filter((target) => target.designator !== designator);
    if (survivors.length === net.targets.length) return; // Net not attached via targets.
    if (survivors.length === 0) {
      this.removeNet(net.id);
      return;
    }

    // Branch geometry aligns to targets (branches[i] routes targets[i + 1]):
    // rebuild the branch list for the surviving fan-out targets, dropping
    // the geometry that led to the removed ports and the promoted trunk's
    // old branch. A missing/mismatched branch (corrupt data) is dropped; the
    // target stays connected logically and its wire re-routes on the next
    // module move.
    const previousBranches = net.branches ?? [];
    const newBranches: NetBranch[] = [];
    for (let newIndex = 1; newIndex < survivors.length; newIndex++) {
      const target = survivors[newIndex];
      const oldIndex = net.targets.indexOf(target);
      const branch = oldIndex >= 1 ? previousBranches[oldIndex - 1] : undefined;
      if (branch && isSameEndpoint(branch.target, target)) {
        newBranches.push(branch);
      }
    }

    net.targets = survivors;
    net.branches = newBranches;

    this.recomposeNet(net);
    this.refreshWireHandles(net.id);
    this.notifyNetlistChange();
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

    this.commitNet(net);
    return true;
  }

  /**
   * Validates and commits an interactive route, whose endpoints may be module
   * ports OR existing nets. Legal combinations, per the 1-output : n-inputs
   * rule:
   * - port → port (oriented so the source is the output side),
   * - free input port → net: taps the net with a new branch (junction),
   * - net → free input port: same result, routed from the junction point.
   * Everything else (output → net, net → output, net → net) is rejected:
   * every existing net already owns exactly one driver.
   */
  public addRoute(start: RoutePoint, waypoints: Pos[], end: RoutePoint): boolean {
    if (start.kind === 'port' && end.kind === 'port') {
      return this.addNet(start.endpoint, waypoints, end.endpoint);
    }

    if (start.kind === 'port' && end.kind === 'net') {
      const port = this.resolvePort(start.endpoint);
      if (!port || port.direction !== 'input') return false;
      return this.addTargetToNet(end.netId, start.endpoint, end.position, waypoints);
    }

    if (start.kind === 'net' && end.kind === 'port') {
      const port = this.resolvePort(end.endpoint);
      if (!port || port.direction !== 'input') return false;
      return this.addTargetToNet(start.netId, end.endpoint, start.position, waypoints);
    }

    return false; // net → net is never legal.
  }

  /**
   * Adds an input port as an additional target of an existing net, routed as
   * a fan-out branch from the given trunk junction point. Enforces one driver
   * per input.
   */
  private addTargetToNet(
    netId: string,
    target: NetEndpoint,
    junction: Pos,
    waypoints: Pos[]
  ): boolean {
    const net = this.nets.get(netId);
    if (!net) return false;

    if (isSameEndpoint(net.source, target)) return false;
    if (net.targets.some((existing) => isSameEndpoint(existing, target))) return false;
    if (netDrivingInput(this.allNets(), target)) return false;
    if (!this.getPortWorldPosition(target.designator, target.portId)) return false;

    net.targets.push(target);
    const branch: NetBranch = { target, junction };
    if (waypoints.length > 0) branch.waypoints = waypoints;
    (net.branches ??= []).push(branch);

    this.recomposeNet(net);
    this.notifyNetlistChange();
    return true;
  }

  /** Creates the wire group for a net and registers all interactions. */
  private commitNet(net: SerializedNet): void {
    const wire = createWireNode(net.id, [], []);
    this.logicLayer.add(wire);
    this.nets.set(net.id, net);
    this.wireNodes.set(net.id, wire);
    this.attachWireInteractions(wire, net.id);

    this.recomposeNet(net);
    this.notifyNetlistChange();
  }

  /** Wires up hover, click, and delete interactions for a wire group. */
  private attachWireInteractions(wire: Konva.Group, netId: string): void {
    wire.on('mouseenter', () => {
      if (this.mode !== 'editor') return;
      if (this.activeTool === 'delete') {
        setWireDangerHover(wire, true);
        this.setCursor('crosshair');
      } else if (this.activeTool === 'select') {
        setWireHover(wire, true);
        this.setCursor('move');
      }
    });

    wire.on('mouseleave', () => {
      if (this.mode !== 'editor') return;
      if (this.activeTool === 'delete') setWireDangerHover(wire, false);
      if (this.activeTool === 'select') {
        setWireHover(wire, false);
        setWireSelected(wire, this.selection.has(netId));
      }
      this.updateCursor();
    });

    wire.on('click', (e) => {
      if (this.mode !== 'editor') return;
      if (this.activeTool === 'delete') {
        this.removeNet(netId);
        return;
      }
      if (this.activeTool !== 'select') return;
      if (e.evt.shiftKey) {
        this.toggleSelection(netId);
      } else {
        this.clearSelection();
        this.select(netId);
      }
    });
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
      if (attached) this.recomposeNet(net);
    }
  }

  /**
   * Rebuilds a net's full rendered geometry: the trunk (source → first
   * target) plus every fan-out branch (junction → its target port). Anchors
   * are resolved through live port positions, so this stays correct during
   * module drags and segment drags alike.
   */
  private recomposeNet(net: SerializedNet): void {
    const wire = this.wireNodes.get(net.id);
    if (!wire) return;

    const target = net.targets[0];
    const sourcePos = this.getPortWorldPosition(net.source.designator, net.source.portId);
    const targetPos = target
      ? this.getPortWorldPosition(target.designator, target.portId)
      : null;
    if (!sourcePos || !targetPos) {
      updateWireNode(wire, [], []);
      return;
    }

    const trunk = composeNetPath(sourcePos, net.waypoints ?? [], targetPos);
    const branches: BranchGeometry[] = (net.branches ?? []).map((branch) => {
      const branchTargetPos = this.getPortWorldPosition(
        branch.target.designator,
        branch.target.portId
      );
      return {
        points: branchTargetPos
          ? composeNetPath(branch.junction, branch.waypoints ?? [], branchTargetPos)
          : [],
        junction: branch.junction,
      };
    });

    updateWireNode(wire, trunk, branches);
  }

  /** Commits a finished wire segment drag into the stored netlist. */
  private commitWireDrag(netId: string, draft: SerializedNet): void {
    const net = this.nets.get(netId);
    if (!net) return;

    net.waypoints = draft.waypoints;
    net.branches = draft.branches;
    this.recomposeNet(net);

    // Refresh the editing handles when the dragged net is selected.
    if (this.selection.has(netId)) {
      const wire = this.wireNodes.get(netId);
      if (wire) {
        removeWaypointHandles(wire);
        this.showWireHandles(netId);
      }
    }

    this.notifyNetlistChange();
  }

  /** Rendered polylines of a net (trunk + branches), for hit-testing. */
  private getNetGeometry(netId: string): NetGeometry | null {
    const wire = this.wireNodes.get(netId);
    if (!wire) return null;

    const trunk = wire.findOne('.wire-trunk');
    const branches: number[][] = [];
    for (const child of wire.getChildren((node) => node.name() === 'wire-branch')) {
      if (child instanceof Konva.Line) {
        const index: unknown = child.getAttr('branchIndex');
        if (typeof index === 'number') branches[index] = child.points();
      }
    }

    return {
      trunk: trunk instanceof Konva.Line ? trunk.points() : [],
      branches,
    };
  }

  /** Closest tap point on any polyline of a net to a scene position. */
  private getNetJunction(netId: string, scene: Pos): Pos | null {
    const geometry = this.getNetGeometry(netId);
    if (!geometry) return null;

    let best: Pos | null = null;
    let bestDistance = Infinity;
    for (const points of [geometry.trunk, ...geometry.branches]) {
      const candidate = closestPointOnPolyline(scene, points, bestDistance);
      if (!candidate) continue;
      const distance = Math.hypot(candidate.x - scene.x, candidate.y - scene.y);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    return best;
  }

  // -------------------------------------------------------- waypoint handles

  /** Adds draggable handles for every explicit bend and junction of a net. */
  private showWireHandles(netId: string): void {
    const net = this.nets.get(netId);
    const wire = this.wireNodes.get(netId);
    if (!net || !wire || this.mode !== 'editor') return;

    (net.waypoints ?? []).forEach((waypoint, index) => {
      this.addWireHandle(wire, netId, waypoint, 'trunk-waypoint', index, -1);
    });

    (net.branches ?? []).forEach((branch, branchIndex) => {
      this.addWireHandle(wire, netId, branch.junction, 'junction', -1, branchIndex);
      (branch.waypoints ?? []).forEach((waypoint, index) => {
        this.addWireHandle(wire, netId, waypoint, 'branch-waypoint', index, branchIndex);
      });
    });
  }

  /** Creates one snap-to-grid draggable handle and wires its drag logic. */
  private addWireHandle(
    wire: Konva.Group,
    netId: string,
    position: Pos,
    kind: 'trunk-waypoint' | 'branch-waypoint' | 'junction',
    index: number,
    branchIndex: number
  ): void {
    const handle = createWaypointHandle(position, kind, index, branchIndex);

    handle.on('dragmove', () => {
      const net = this.nets.get(netId);
      if (!net) return;

      const center = getWaypointHandlePosition(handle);
      const snapped = {
        x: GridManager.snap(center.x, this.getGridSize()),
        y: GridManager.snap(center.y, this.getGridSize()),
      };
      setWaypointHandlePosition(handle, snapped);

      if (kind === 'trunk-waypoint' && index >= 0) {
        if (net.waypoints?.[index]) net.waypoints[index] = snapped;
      } else if (kind === 'branch-waypoint' && index >= 0 && branchIndex >= 0) {
        const branch = net.branches?.[branchIndex];
        if (branch?.waypoints?.[index]) branch.waypoints[index] = snapped;
      } else if (kind === 'junction' && branchIndex >= 0) {
        const branch = net.branches?.[branchIndex];
        if (branch) branch.junction = snapped;
      }

      this.recomposeNet(net);
    });

    handle.on('dragend', () => this.notifyNetlistChange());

    wire.add(handle);
  }

  /** Rebuilds a selected net's editing handles (e.g. after its branches changed). */
  private refreshWireHandles(netId: string): void {
    if (!this.selection.has(netId)) return;
    const wire = this.wireNodes.get(netId);
    if (!wire) return;

    removeWaypointHandles(wire);
    this.showWireHandles(netId);
  }

  // ----------------------------------------------------- route highlighting

  /**
   * Highlights every legally connectable target for the active route, per the
   * 1-output : n-inputs rule:
   * - from an output port → free (undriven) input ports,
   * - from a free input port → every output port and every existing net,
   * - from an already-driven input port → nothing (delete its net first),
   * - from a net → free input ports.
   */
  private applyRouteHighlights(start: RoutePoint): void {
    this.clearRouteHighlights();
    const nets = this.allNets();

    if (start.kind === 'port') {
      const port = this.resolvePort(start.endpoint);
      if (!port) return;

      if (port.direction === 'output') {
        this.highlightFreeInputs(nets, start.endpoint);
      } else if (!netDrivingInput(nets, start.endpoint)) {
        this.highlightPortsOfDirection('output');
        this.highlightAllNets();
      }
    } else {
      this.highlightFreeInputs(nets, null);
    }
  }

  private highlightFreeInputs(nets: SerializedNet[], exclude: NetEndpoint | null): void {
    for (const [designator, hydrated] of this.hydratedModules) {
      for (const port of hydrated.ports) {
        if (port.direction !== 'input') continue;
        const endpoint: NetEndpoint = { designator, portId: port.id };
        if (exclude && isSameEndpoint(exclude, endpoint)) continue;
        if (netDrivingInput(nets, endpoint)) continue;
        this.highlightPortValid(designator, port.id);
      }
    }
  }

  private highlightPortsOfDirection(direction: 'input' | 'output'): void {
    for (const [designator, hydrated] of this.hydratedModules) {
      for (const port of hydrated.ports) {
        if (port.direction === direction) this.highlightPortValid(designator, port.id);
      }
    }
  }

  private highlightPortValid(designator: string, portId: string): void {
    const node = this.moduleNodes.get(designator);
    if (!node) return;
    setPortHighlighted(node, portId, 'valid');
    this.routeHighlightedPorts.add(`${designator}:${portId}`);
  }

  private highlightAllNets(): void {
    for (const [netId, wire] of this.wireNodes) {
      setWireValidHighlight(wire, true);
      this.routeHighlightedNets.add(netId);
    }
  }

  private clearRouteHighlights(): void {
    for (const key of this.routeHighlightedPorts) {
      const separator = key.indexOf(':');
      const designator = key.slice(0, separator);
      const portId = key.slice(separator + 1);
      const node = this.moduleNodes.get(designator);
      if (node) setPortHighlighted(node, portId, 'idle');
    }
    this.routeHighlightedPorts.clear();

    for (const netId of this.routeHighlightedNets) {
      const wire = this.wireNodes.get(netId);
      if (wire) {
        setWireValidHighlight(wire, false);
        setWireSelected(wire, this.selection.has(netId));
      }
    }
    this.routeHighlightedNets.clear();
  }

  /** Hover feedback that never clobbers an active "valid target" highlight. */
  private setPortHoverState(endpoint: NetEndpoint, hovered: boolean): void {
    const node = this.moduleNodes.get(endpoint.designator);
    if (!node) return;

    const isRouteTarget = this.routeHighlightedPorts.has(
      `${endpoint.designator}:${endpoint.portId}`
    );

    if (hovered) {
      // While a route is pending, only legally connectable targets respond;
      // invalid ports stay idle (no size-up). Valid targets keep their
      // green "connectable" highlight instead of the plain hover style.
      if (this.contextTracker.isActive('schematic:routing') && !isRouteTarget) return;
      setPortHighlighted(node, endpoint.portId, isRouteTarget ? 'valid' : 'hover');
      return;
    }

    setPortHighlighted(node, endpoint.portId, isRouteTarget ? 'valid' : 'idle');
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
    this.gridManager.render();
  }

  private notifyViewportChange(): void {
    // The grid only covers the visible scene rectangle: re-render on pan/zoom.
    this.gridManager.render();
    if (this.config.onViewportChange) {
      this.config.onViewportChange(this.getViewportState());
    }
  }

  // -------------------------------------------------------------------- grid

  /** Current grid settings (visibility, style, and the snapping grid size). */
  public getGridSettings(): GridSettings {
    return this.gridSettings;
  }

  /**
   * Applies new grid settings: redraws the grid and re-targets every snapping
   * consumer (placement, routing, wire drags, waypoint handles). Existing
   * module positions are left untouched.
   */
  public applyGridSettings(settings: GridSettings): void {
    this.gridSettings = settings;
    this.gridManager.applySettings(settings);
  }

  /** Live base grid size used by every snapping consumer. */
  private getGridSize(): number {
    return this.gridSettings.size;
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
    setPlacementCancelListener(null);
    pendingPlacementTypeId.value = null;
    this.routingManager.setEnabled(false);
    this.marqueeManager.setEnabled(false);
    this.wireDragManager.setEnabled(false);
    this.placementManager.cancel();
    this.shortcutManager.detach();
    this.eventManager.detach();
    this.stage.destroy();
  }
}

