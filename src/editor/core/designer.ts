/** @format */

import Konva from 'konva';
import { DesignerConfig, EditorTool, EditorMode, ViewportState, PlacementState, Point } from './types';
import { GridManager, GRID_UNIT } from './grid';
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
import type { NetEndpoint, SerializedNet, NetBranch, NetStyle } from '@/shared/types/netlist';
import { isSameEndpoint, netDrivingInput } from '@/shared/utils/netlist';
import type { GridSettings, ArchitectureConfiguration } from '@/shared/types/architecture';
import { closestPointOnPolyline, rectsIntersect, SceneRect } from '@/shared/utils/geometry';
import { composeNetPath, composeNetPathVerbatim } from './render/orthogonal-path';
import {
  createWireNode,
  updateWireNode,
  setWireSelected,
  setWireHover,
  setWireValidHighlight,
  setWireWarningState,
  setWireDangerHover,
  setWireStyle,
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
  setPortWarning,
  nodePortWorldPosition,
  type PortHighlightState,
} from './render/module-node';
import { showTransientTooltip, destroyTransientTooltip } from './render/tooltip';
import { getClipboard, setClipboard } from './clipboard';
import { HistoryManager, historyEntryEquals, HistoryEntry } from './history';
import { lintArchitecture } from '@/core/engine/lint';
import type { LintIssue } from '@/core/engine/lint';

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
  /** Topmost, non-listening layer for runtime port value labels (viewer). */
  private valueLayer: Konva.Layer;

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

  /** True while a saved architecture is being restored (not a user edit). */
  private loading = false;

  /**
   * Memento history over committed documents. `lastCommitted` is the
   * snapshot of the state at the last commit boundary (i.e. the pre-mutation
   * state of the *next* mutation); it is pushed onto the undo stack by the
   * mutation that follows it. `restoring` suppresses recording while an
   * undo/redo application replays an entry; the batching fields coalesce
   * multi-mutation gestures (multi-delete, paste, settings cascades) into
   * a single entry.
   */
  private readonly history = new HistoryManager();
  private lastCommitted: HistoryEntry | null = null;
  private restoring = false;
  private historyBatching = false;
  private historyBatchMutated = false;

  /** Position snapshot of a multi-selected module group while dragging. */
  private dragSnapshot: Map<string, Point> | null = null;

  /** Ports highlighted as route targets (designator:portId → highlight state). */
  private readonly routeHighlightedPorts = new Map<string, PortHighlightState>();
  /** Nets highlighted as route targets (netId → highlight state). */
  private readonly routeHighlightedNets = new Map<string, "valid" | "warning">();
  /** Lint-flagged nets (persistent warning styling until fixed). */
  private readonly warnedNets = new Set<string>();
  /** Lint-flagged ports ("designator:portId") — persistent warning rings. */
  private readonly warnedPorts = new Set<string>();

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
    // Sits above everything so the always-on port value numbers render on
    // top of the wires. Non-listening: labels never interact, and the layer
    // must not intercept events aimed at the logic layer below.
    this.valueLayer = new Konva.Layer({ listening: false });

    this.stage.add(this.gridLayer);
    this.stage.add(this.logicLayer);
    this.stage.add(this.interactionLayer);
    this.stage.add(this.valueLayer);

    this.gridManager = new GridManager(this.gridLayer, this.gridSettings);

    // Event + shortcut wiring
    this.eventManager = new EventManager(this.stage, {
      onViewportChange: () => this.notifyViewportChange(),
      onResize: () => this.handleResize(),
      // Viewer mode owns the primary button (nodes aren't draggable there) —
      // left-drag pans, mirroring the right-button pan of editor mode.
      canPanWithPrimary: () => this.mode === 'viewer',
    });
    this.contextTracker = new ContextTracker();
    this.shortcutManager = new ShortcutManager(this.contextTracker);
    this.history.onChange = () => this.notifyHistoryChange();
    // Baseline for a blank canvas: the first placement is undoable back to
    // empty. A project load resets this baseline (loadArchitecture).
    this.lastCommitted = this.captureHistoryEntry();

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
      isAltPressed: () => this.eventManager.isAltPressed(),
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
      getPortDirection: (designator, portId) =>
        this.resolvePort({ designator, portId })?.direction ?? null,
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

    // Copy/Paste: selected modules plus their fully-internal nets. The
    // clipboard lives outside the designer (survives perspective switches).
    this.shortcutManager.register({
      key: 'c',
      ctrl: true,
      contexts: ['schematic:selection'],
      handler: () => this.copySelection() > 0,
    });
    this.shortcutManager.register({
      key: 'v',
      ctrl: true,
      contexts: ['schematic:editor'],
      handler: () => this.paste() > 0,
    });

    // Undo/redo over the committed-document history. Shift matching on the
    // Ctrl+Z pair distinguishes plain undo from Ctrl+Shift+Z redo.
    this.shortcutManager.register({
      key: 'z',
      ctrl: true,
      shift: false,
      contexts: ['schematic:editor'],
      handler: () => {
        this.undo();
      },
    });
    this.shortcutManager.register({
      key: 'z',
      ctrl: true,
      shift: true,
      contexts: ['schematic:editor'],
      handler: () => {
        this.redo();
      },
    });
    this.shortcutManager.register({
      key: 'y',
      ctrl: true,
      contexts: ['schematic:editor'],
      handler: () => {
        this.redo();
      },
    });
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
      // Selection styling is gone — restore the persistent lint warning
      // styling when the net is flagged.
      this.applyWireWarning(id);
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
    // Multi-delete fans out into several removeModule/removeNet calls;
    // commit the whole gesture as a single undo entry.
    this.runBatched(() => {
      let managedBlocked: string | null = null;
      for (const id of Array.from(this.selection)) {
        if (this.isManagedModule(id)) {
          managedBlocked ??= id;
          continue;
        }
        if (!this.removeModule(id)) {
          this.removeNet(id);
        }
      }
      if (managedBlocked) this.notifyManagedDelete(managedBlocked);
      this.notifySelectionChange();
    });
  }

  /**
   * Surfaces why a settings-managed stage boundary register refuses
   * deletion — silently skipping it reads as the delete key being broken.
   */
  private notifyManagedDelete(designator: string): void {
    const module = this.hydratedModules.get(designator);
    const stageId = (module?.config as Record<string, unknown> | undefined)?.stageId;
    const name = typeof stageId === "string" ? stageId : designator;
    this.config.onUserError?.(
      `${name} is a pipeline stage register managed by the architecture configuration — remove the stage in Architecture Settings to delete it.`
    );
  }

  /**
   * True when the module is a settings-managed stage boundary register.
   * Managed registers are created/removed only through the Architecture
   * Settings and must be skipped by delete/clipboard interactions.
   */
  public isManagedModule(designator: string): boolean {
    const module = this.hydratedModules.get(designator);
    return module?.typeId === "std.register" && (module.config as Record<string, unknown>)?.managed === true;
  }

  // --------------------------------------------------------------- copy/paste

  /**
   * Copies the selected modules and every net fully contained in the
   * selection (source and all targets inside it). Boundary-crossing nets
   * are dropped — standard EDA clipboard semantics.
   * @returns the number of modules copied.
   */
  public copySelection(): number {
    const selected = Array.from(this.selection)
      .map((id) => this.hydratedModules.get(id))
      .filter((module): module is HydratedModule => !!module)
      // Managed stage registers are not clipboard-copyable.
      .filter((module) => !this.isManagedModule(module.designator));
    if (selected.length === 0) return 0;

    const designators = new Set(selected.map((module) => module.designator));

    const modules: SerializedModule[] = selected.map((module) => ({
      designator: module.designator,
      typeId: module.typeId,
      position: { x: module.position.x, y: module.position.y },
      rotation: module.rotation,
      config: JSON.parse(JSON.stringify(module.config ?? {})),
    }));

    const nets: SerializedNet[] = this.allNets()
      .filter(
        (net) =>
          designators.has(net.source.designator) &&
          net.targets.every((target) => designators.has(target.designator))
      )
      .map((net) => JSON.parse(JSON.stringify(net)) as SerializedNet);

    setClipboard(modules, nets);
    return modules.length;
  }

  /**
   * Pastes the clipboard: fresh designators, a grid-snapped offset that
   * grows per consecutive paste, internal nets remapped onto the fresh
   * instances, and the pasted set left selected for immediate move/delete.
   * @returns the number of modules pasted.
   */
  public paste(): number {
    const clip = getClipboard();
    if (!clip || clip.modules.length === 0) return 0;

    // Paste offset is deliberately coarser than the 1-unit snap so copies
    // land clearly beside the originals (and drift further per paste).
    const step = 40;
    const offset = step * (clip.pasteCount + 1);
    clip.pasteCount += 1;

    const shift = (point: Pos): Pos => ({ x: point.x + offset, y: point.y + offset });

    // Stamping modules + remapping nets fans out into many committed calls;
    // commit the whole paste gesture as a single undo entry.
    this.runBatched(() => {
      this.clearSelection();

      // Stamp modules first, remembering old → new designators.
      const designatorMap = new Map<string, string>();
      for (const module of clip.modules) {
        const designator = `u${++this.moduleCounter}`;
        designatorMap.set(module.designator, designator);
        this.instantiateModule({
          designator,
          typeId: module.typeId,
          position: shift(module.position),
          rotation: module.rotation,
          config: JSON.parse(JSON.stringify(module.config ?? {})),
        });
      }

      // Remap the internal nets onto the fresh instances.
      const remap = (endpoint: NetEndpoint): NetEndpoint => ({
        designator: designatorMap.get(endpoint.designator) ?? endpoint.designator,
        portId: endpoint.portId,
      });
      for (const net of clip.nets) {
        const restored: SerializedNet = {
          id: `n${++this.netCounter}`,
          source: remap(net.source),
          targets: net.targets.map(remap),
          style: net.style,
        };
        if (net.waypoints) restored.waypoints = net.waypoints.map(shift);
        if (net.branches) {
          restored.branches = net.branches.map((branch) => ({
            target: remap(branch.target),
            junction: shift(branch.junction),
            ...(branch.waypoints ? { waypoints: branch.waypoints.map(shift) } : {}),
          }));
        }
        this.commitNet(restored);
      }

      for (const designator of designatorMap.values()) this.select(designator);

      this.notifyDocumentChange();
    });

    return clip.modules.length;
  }

  // ----------------------------------------------------------------- history

  /** Serializable pre-mutation snapshot for the undo stack. */
  private captureHistoryEntry(): HistoryEntry {
    return {
      modules: this.getSerializedModules(),
      nets: JSON.parse(JSON.stringify(this.allNets())) as SerializedNet[],
      moduleCounter: this.moduleCounter,
      netCounter: this.netCounter,
    };
  }

  /**
   * Runs `action`, coalescing every document mutation it commits into a
   * single history entry (the pre-batch state). Used for gestures that fan
   * out into several designer calls: multi-delete, paste, and the
   * architecture-settings cascade.
   */
  private runBatched(action: () => void, configuration?: ArchitectureConfiguration): void {
    if (this.historyBatching) {
      // Already inside a batch — fold into the enclosing entry.
      action();
      return;
    }
    const pre = this.lastCommitted;
    this.historyBatchMutated = false;
    this.historyBatching = true;
    try {
      action();
    } finally {
      this.historyBatching = false;
    }
    if (!pre || !this.historyBatchMutated) return;
    this.history.push(configuration ? { ...pre, configuration } : pre);
    this.lastCommitted = this.captureHistoryEntry();
  }

  /**
   * Wraps an architecture-settings cascade so it commits as ONE undo entry
   * that also restores the prior configuration when undone.
   */
  public withSettingsBatch(action: () => void, configuration: ArchitectureConfiguration): void {
    this.runBatched(action, configuration);
  }

  public canUndo(): boolean {
    return this.history.canUndo();
  }

  public canRedo(): boolean {
    return this.history.canRedo();
  }

  /** Undoes the last committed document change (editor mode only). */
  public undo(): void {
    if (this.mode !== 'editor' || this.loading) return;
    this.cancelTransientInteraction();
    const entry = this.history.undo(this.captureHistoryEntry());
    this.applyHistoryEntry(entry);
  }

  /** Redoes the most recently undone change (editor mode only). */
  public redo(): void {
    if (this.mode !== 'editor' || this.loading) return;
    this.cancelTransientInteraction();
    const entry = this.history.redo(this.captureHistoryEntry());
    this.applyHistoryEntry(entry);
  }

  /** Drops any in-flight placement/routing before swapping the document. */
  private cancelTransientInteraction(): void {
    if (this.contextTracker.isActive('schematic:routing')) {
      this.routingManager.cancel();
    }
    this.cancelPlacement();
  }

  /** Replaces the document with a history entry's contents. */
  private applyHistoryEntry(entry: HistoryEntry | null): void {
    if (!entry) return;

    this.clearDocument();
    this.restoring = true;
    try {
      // Validation/linking is reused; entries came from a live document.
      this.loadArchitecture({ modules: entry.modules, nets: entry.nets });
      this.moduleCounter = entry.moduleCounter;
      this.netCounter = entry.netCounter;
      this.lastCommitted = entry;
    } finally {
      this.restoring = false;
    }

    if (entry.configuration) {
      this.config.onConfigurationRestore?.(entry.configuration);
    }
    // Marks the project unsaved and bumps the revision — without recording
    // (restoring guards recordHistory); lint already ran inside load.
    this.config.onDocumentChange?.();
    this.notifySelectionChange();
  }

  /** Destroys every canvas element and resets all tracked document state. */
  private clearDocument(): void {
    for (const node of Array.from(this.moduleNodes.values())) node.destroy();
    this.moduleNodes.clear();
    this.hydratedModules.clear();

    for (const wire of Array.from(this.wireNodes.values())) wire.destroy();
    this.wireNodes.clear();
    this.nets.clear();

    this.selection.clear();
    this.contextTracker.disable('schematic:selection');

    this.warnedNets.clear();
    this.warnedPorts.clear();
    this.routeHighlightedPorts.clear();
    this.routeHighlightedNets.clear();
  }

  /** Publishes undo/redo availability to the host. */
  private notifyHistoryChange(): void {
    if (this.config.onHistoryChange) {
      this.config.onHistoryChange(this.history.canUndo(), this.history.canRedo());
    }
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
    if (!getManifest(typeId)) return null;

    const designator = `u${++this.moduleCounter}`;
    this.instantiateModule({
      designator,
      typeId,
      position: { x: position.x, y: position.y },
      rotation,
      config: {},
    });
    this.notifyDocumentChange();

    return designator;
  }

  /** Hydrates and renders a module instance, wiring interactions onto the node. */
  private instantiateModule(serialized: SerializedModule): void {
    const hydrated = hydrateModule(serialized);
    const node = createModuleNode(hydrated, this.mode === 'editor' ? 'editor' : 'viewer');
    this.logicLayer.add(node);
    this.moduleNodes.set(serialized.designator, node);
    this.hydratedModules.set(serialized.designator, hydrated);

    this.attachModuleInteractions(node, serialized.designator);
  }

  /** Wires up hover, click, and drag interactions for a module node. */
  private attachModuleInteractions(node: Konva.Group, designator: string): void {
    node.on('mouseenter', () => {
      if (this.mode !== 'editor') return;
      if (this.activeTool === 'delete') {
        setNodeDangerHover(node, !this.isManagedModule(designator));
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
        if (this.isManagedModule(designator)) {
          this.notifyManagedDelete(designator);
          return;
        }
        this.removeModule(designator);
        return;
      }
      if (this.activeTool !== 'select') return;
      // Shift / Ctrl (⌘ on macOS) toggle the item; a plain click replaces
      // the selection with just this item.
      if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
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
        // Group drag: every member's position commits through its own call;
        // commit the whole gesture as a single undo entry.
        const snapshot = this.dragSnapshot;
        this.runBatched(() => {
          for (const id of snapshot.keys()) this.commitModulePosition(id);
          this.dragSnapshot = null;
        });
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
    this.notifyDocumentChange();
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

    this.notifyDocumentChange();
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

    // Width mismatch: the connection is still allowed (the engine and the
    // lint pass flag it), but surface it immediately next to the target port.
    const sourcePortDef = this.resolvePort(source);
    const targetPortDef = this.resolvePort(target);
    if (sourcePortDef && targetPortDef && sourcePortDef.bits !== targetPortDef.bits) {
      this.warnWidthMismatch(targetPos, source, target, sourcePortDef.bits, targetPortDef.bits);
    }

    this.commitNet(net);
    return true;
  }

  /** Shows the transient bit-width mismatch warning next to a target port. */
  private warnWidthMismatch(
    targetPos: Pos,
    source: NetEndpoint,
    target: NetEndpoint,
    sourceBits: number,
    targetBits: number
  ): void {
    showTransientTooltip(
      this.interactionLayer,
      targetPos,
      `${sourceBits}-bit ${source.designator}:${source.portId} feeds ${targetBits}-bit ${target.designator}:${target.portId}`
    );
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

    // Width mismatch on a junction tap: allowed, but warned like port routes.
    const sourcePortDef = this.resolvePort(net.source);
    const targetPortDef = this.resolvePort(target);
    if (sourcePortDef && targetPortDef && sourcePortDef.bits !== targetPortDef.bits) {
      const targetPos = this.getPortWorldPosition(target.designator, target.portId);
      if (targetPos) {
        this.warnWidthMismatch(
          targetPos,
          net.source,
          target,
          sourcePortDef.bits,
          targetPortDef.bits
        );
      }
    }

    this.recomposeNet(net);
    this.notifyNetlistChange();
    return true;
  }

  /** Creates the wire group for a net and registers all interactions. */
  private commitNet(net: SerializedNet): void {
    const wire = createWireNode(net.id, [], [], net.style ?? 'solid');
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
      if (this.activeTool === 'delete') {
        setWireDangerHover(wire, false);
        this.applyWireWarning(netId);
      }
      if (this.activeTool === 'select') {
        setWireHover(wire, false);
        if (this.selection.has(netId)) {
          setWireSelected(wire, true);
        } else {
          this.applyWireWarning(netId);
        }
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
      // Shift / Ctrl (⌘ on macOS) toggle the net; a plain click replaces
      // the selection with just this net.
      if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
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

  /** A net's stored render style, or null when the net does not exist. */
  public getNetStyle(netId: string): NetStyle | null {
    return this.nets.get(netId)?.style ?? null;
  }

  /**
   * Applies a render style to the given nets. Nets already styled that way
   * are skipped, and one notification covers the whole batch so a
   * multi-select restyle commits as a single document change.
   * @returns the number of nets actually restyled.
   */
  public setNetStyle(netIds: string[], style: NetStyle): number {
    let changed = 0;
    for (const netId of netIds) {
      const net = this.nets.get(netId);
      if (!net || net.style === style) continue;
      net.style = style;

      const wire = this.wireNodes.get(netId);
      if (wire) setWireStyle(wire, style);
      changed += 1;
    }
    if (changed > 0) this.notifyNetlistChange();
    return changed;
  }

  /** The Konva stage (runtime probing / hit-testing from the viewer). */
  public getStage(): Konva.Stage {
    return this.stage;
  }

  /** A net's rendered wire group, for runtime signal styling. */
  public getWireNode(netId: string): Konva.Group | null {
    return this.wireNodes.get(netId) ?? null;
  }

  /** A module's rendered node group, for runtime value labels. */
  public getModuleNode(designator: string): Konva.Group | null {
    return this.moduleNodes.get(designator) ?? null;
  }

  /**
   * The topmost layer that renders the always-on port value numbers above
   * the wires (Simulate perspective). Non-listening; empty in editor mode.
   */
  public getValueLayer(): Konva.Layer {
    return this.valueLayer;
  }

  // ----------------------------------------------------------------- persist

  /**
   * Serializable snapshot of every module on the canvas (designator, type,
   * position, rotation, and user config). Together with `getNets()` this is
   * the complete persisted architecture document.
   */
  public getSerializedModules(): SerializedModule[] {
    return Array.from(this.hydratedModules.values()).map((module) => ({
      designator: module.designator,
      typeId: module.typeId,
      position: { x: module.position.x, y: module.position.y },
      rotation: module.rotation,
      config: JSON.parse(JSON.stringify(module.config ?? {})),
    }));
  }

  /**
   * Restores a serialized architecture onto the canvas: rehydrates modules,
   * rebuilds wire nodes, and recomputes every net's rendered geometry.
   * Unknown module types and nets with unavailable endpoints are skipped and
   * reported as warnings instead of aborting the whole load. Designator
   * counters are restored so newly created elements never collide with the
   * restored ids.
   */
  public loadArchitecture(
    arch: { modules?: SerializedModule[]; nets?: SerializedNet[] },
    options: { resetHistory?: boolean } = {}
  ): string[] {
    const warnings: string[] = [];

    this.loading = true;
    try {
      for (const serialized of arch.modules ?? []) {
        if (!getManifest(serialized.typeId)) {
          warnings.push(`Skipped module "${serialized.designator}" — unknown type "${serialized.typeId}".`);
          continue;
        }
        if (this.hydratedModules.has(serialized.designator)) {
          warnings.push(`Skipped duplicate module designator "${serialized.designator}".`);
          continue;
        }

        const module: SerializedModule = {
          designator: serialized.designator,
          typeId: serialized.typeId,
          position: { x: serialized.position.x, y: serialized.position.y },
          rotation: serialized.rotation ?? 0,
          config: JSON.parse(JSON.stringify(serialized.config ?? {})),
        };

        try {
          this.instantiateModule(module);
        } catch (error) {
          warnings.push(`Skipped module "${serialized.designator}" — ${(error as Error).message}`);
          continue;
        }
        this.moduleCounter = Math.max(this.moduleCounter, idNumber(serialized.designator));
      }

      for (const net of arch.nets ?? []) {
        if (this.nets.has(net.id)) {
          warnings.push(`Skipped duplicate net id "${net.id}".`);
          continue;
        }

        const sourcePort = this.resolvePort(net.source);
        if (!sourcePort || sourcePort.direction !== 'output') {
          warnings.push(`Skipped net "${net.id}" — its source port is unavailable.`);
          continue;
        }

        // Keep only targets that still exist, are inputs, and are not already
        // driven (one driver per input).
        const targets = (net.targets ?? []).filter((target) => {
          const port = this.resolvePort(target);
          return !!port && port.direction === 'input' && !netDrivingInput(this.allNets(), target);
        });
        if (targets.length === 0) {
          warnings.push(`Skipped net "${net.id}" — no valid target ports.`);
          continue;
        }
        if (targets.length < (net.targets ?? []).length) {
          warnings.push(`Net "${net.id}" — some targets were unavailable and got dropped.`);
        }

        const restored: SerializedNet = {
          id: net.id,
          source: { ...net.source },
          targets: targets.map((target) => ({ ...target })),
          style: net.style,
        };
        if (net.waypoints) {
          restored.waypoints = net.waypoints.map((point) => ({ ...point }));
        }
        // Rebuild fan-out branches so they stay aligned with the surviving
        // targets (branches[i] routes targets[i + 1]).
        if (net.branches) {
          const branches: NetBranch[] = [];
          for (let index = 1; index < restored.targets.length; index++) {
            const target = restored.targets[index];
            const originalIndex = (net.targets ?? []).findIndex((candidate) =>
              isSameEndpoint(candidate, target)
            );
            const branch = originalIndex >= 1 ? net.branches[originalIndex - 1] : undefined;
            if (branch && isSameEndpoint(branch.target, target)) {
              branches.push({
                target: { ...branch.target },
                junction: { ...branch.junction },
                ...(branch.waypoints
                  ? { waypoints: branch.waypoints.map((point) => ({ ...point })) }
                  : {}),
              });
            }
          }
          if (branches.length > 0) restored.branches = branches;
        }

        const wire = createWireNode(restored.id, [], [], restored.style ?? 'solid');
        this.logicLayer.add(wire);
        this.nets.set(restored.id, restored);
        this.wireNodes.set(restored.id, wire);
        this.attachWireInteractions(wire, restored.id);
        this.recomposeNet(restored);
        this.netCounter = Math.max(this.netCounter, idNumber(restored.id));
      }

      this.logicLayer.batchDraw();
    } finally {
      this.loading = false;
      // Loading suppresses per-mutation notifications — lint once at the end.
      this.runLint();
    }

    if (options.resetHistory) {
      // A freshly loaded project is the undo baseline: nothing to undo back
      // to, and no stale entries referring to a different document.
      this.history.clear();
      this.lastCommitted = this.captureHistoryEntry();
      this.notifyHistoryChange();
    }

    return warnings;
  }

  // ----------------------------------------------------------------- config

  /** Read-only access to a module instance (e.g. for Inspector panels). */
  public getModule(designator: string): HydratedModule | null {
    return this.hydratedModules.get(designator) ?? null;
  }

  /**
   * Applies a new configuration to a module instance: rehydrates it (ports
   * and evaluators are rebuilt from the new config), re-renders its node in
   * place, and reconciles every net attached to it — endpoints whose ports
   * no longer exist after the change are dropped, and nets left without a
   * valid source or with no targets are removed entirely.
   */
  public setModuleConfig(designator: string, config: Record<string, unknown>): boolean {
    const hydrated = this.hydratedModules.get(designator);
    const node = this.moduleNodes.get(designator);
    if (!hydrated || !node) return false;

    const serialized: SerializedModule = {
      designator,
      typeId: hydrated.typeId,
      position: { x: hydrated.position.x, y: hydrated.position.y },
      rotation: hydrated.rotation,
      config: JSON.parse(JSON.stringify(config)) as Record<string, unknown>,
    };

    const rehydrated = hydrateModule(serialized);
    this.hydratedModules.set(designator, rehydrated);

    this.rebuildModuleNodeInPlace(designator);

    this.reconcileNetsForModule(designator);
    this.logicLayer.batchDraw();
    this.notifyNetlistChange();
    this.notifyDocumentChange();

    return true;
  }

  /**
   * Rebuilds a module's node in place: fresh theme colors and any port
   * changes from a preceding rehydration, keeping the previous layer order,
   * transform, selection highlight, and interaction wiring.
   */
  private rebuildModuleNodeInPlace(designator: string): void {
    const hydrated = this.hydratedModules.get(designator);
    const node = this.moduleNodes.get(designator);
    if (!hydrated || !node) return;

    const index = node.zIndex();
    const x = node.x();
    const y = node.y();
    const rotation = node.rotation();
    const wasSelected = this.selection.has(designator);

    const fresh = createModuleNode(hydrated, this.mode === 'editor' ? 'editor' : 'viewer');
    this.logicLayer.add(fresh);
    node.destroy();
    fresh.zIndex(index);
    fresh.position({ x, y });
    fresh.rotation(rotation);
    this.moduleNodes.set(designator, fresh);
    this.attachModuleInteractions(fresh, designator);
    if (wasSelected) setNodeSelected(fresh, true);
  }

  /**
   * Reconciles every net attached to a module whose port set changed:
   * targets (and their branches) referencing removed ports are dropped,
   * and nets left without a valid source or with no targets are removed.
   */
  private reconcileNetsForModule(designator: string): void {
    for (const net of this.allNets()) {
      const touches =
        net.source.designator === designator ||
        net.targets.some((target) => target.designator === designator);
      if (!touches) continue;

      if (!this.resolvePort(net.source)) {
        this.removeNet(net.id);
        continue;
      }

      const targets = net.targets.filter((target) => !!this.resolvePort(target));
      if (targets.length === 0) {
        this.removeNet(net.id);
        continue;
      }
      if (targets.length !== net.targets.length) {
        net.targets = targets;
        if (net.branches) {
          net.branches = net.branches.filter((branch) =>
            targets.some((target) => isSameEndpoint(target, branch.target))
          );
        }
      }
      this.recomposeNet(net);
    }
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

    const trunk = net.freeform
      ? composeNetPathVerbatim(sourcePos, net.waypoints ?? [], targetPos)
      : composeNetPath(sourcePos, net.waypoints ?? [], targetPos);
    const branches: BranchGeometry[] = (net.branches ?? []).map((branch) => {
      const branchTargetPos = this.getPortWorldPosition(
        branch.target.designator,
        branch.target.portId
      );
      return {
        points: branchTargetPos
          ? branch.freeform
            ? composeNetPathVerbatim(branch.junction, branch.waypoints ?? [], branchTargetPos)
            : composeNetPath(branch.junction, branch.waypoints ?? [], branchTargetPos)
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
    net.freeform = draft.freeform;
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
   *
   * Candidates matching the start's width highlight green (`valid`);
   * direction-legal but width-mismatched ones highlight yellow (`warning`)
   * — connectable, but committing will flag the mismatch.
   */
  private applyRouteHighlights(start: RoutePoint): void {
    this.clearRouteHighlights();
    const nets = this.allNets();

    if (start.kind === 'port') {
      const port = this.resolvePort(start.endpoint);
      if (!port) return;

      if (port.direction === 'output') {
        this.highlightFreeInputs(nets, start.endpoint, port.bits);
      } else if (!netDrivingInput(nets, start.endpoint)) {
        this.highlightPortsOfDirection('output', port.bits);
        this.highlightAllNets(port.bits);
      }
    } else {
      // From a net: its source port's width decides candidate compatibility.
      const sourcePort = this.nets.has(start.netId)
        ? this.resolvePort(this.nets.get(start.netId)!.source)
        : null;
      this.highlightFreeInputs(nets, null, sourcePort?.bits ?? null);
    }
  }

  /** Highlights a route-candidate port in `valid` or `warning` state. */
  private routeState(portBits: number, sourceBits: number | null): 'valid' | 'warning' {
    return sourceBits === null || portBits === sourceBits ? 'valid' : 'warning';
  }

  private highlightFreeInputs(
    nets: SerializedNet[],
    exclude: NetEndpoint | null,
    sourceBits: number | null
  ): void {
    for (const [designator, hydrated] of this.hydratedModules) {
      for (const port of hydrated.ports) {
        if (port.direction !== 'input') continue;
        const endpoint: NetEndpoint = { designator, portId: port.id };
        if (exclude && isSameEndpoint(exclude, endpoint)) continue;
        if (netDrivingInput(nets, endpoint)) continue;
        this.highlightRoutePort(designator, port.id, this.routeState(port.bits, sourceBits));
      }
    }
  }

  private highlightPortsOfDirection(direction: 'input' | 'output', sourceBits: number | null): void {
    for (const [designator, hydrated] of this.hydratedModules) {
      for (const port of hydrated.ports) {
        if (port.direction !== direction) continue;
        this.highlightRoutePort(designator, port.id, this.routeState(port.bits, sourceBits));
      }
    }
  }

  private highlightRoutePort(designator: string, portId: string, state: 'valid' | 'warning'): void {
    const node = this.moduleNodes.get(designator);
    if (!node) return;
    setPortHighlighted(node, portId, state);
    this.routeHighlightedPorts.set(`${designator}:${portId}`, state);
  }

  private highlightAllNets(sourceBits: number | null): void {
    for (const [netId, wire] of this.wireNodes) {
      const net = this.nets.get(netId);
      const sourcePort = net ? this.resolvePort(net.source) : null;
      const mode = !sourcePort
        ? 'valid'
        : this.routeState(sourcePort.bits, sourceBits);
      setWireValidHighlight(wire, mode);
      this.routeHighlightedNets.set(netId, mode);
    }
  }

  private clearRouteHighlights(): void {
    for (const [key] of this.routeHighlightedPorts) {
      const separator = key.indexOf(':');
      const designator = key.slice(0, separator);
      const portId = key.slice(separator + 1);
      const node = this.moduleNodes.get(designator);
      // Restore the persistent warning ring when the port is lint-flagged.
      if (node) {
        if (this.warnedPorts.has(key)) setPortWarning(node, portId, true);
        else setPortHighlighted(node, portId, 'idle');
      }
    }
    this.routeHighlightedPorts.clear();

    for (const [netId] of this.routeHighlightedNets) {
      const wire = this.wireNodes.get(netId);
      if (wire) {
        setWireValidHighlight(wire, false);
        if (this.selection.has(netId)) setWireSelected(wire, true);
        else this.applyWireWarning(netId);
      }
    }
    this.routeHighlightedNets.clear();
  }

  /** Hover feedback that never clobbers an active route-target highlight. */
  private setPortHoverState(endpoint: NetEndpoint, hovered: boolean): void {
    const node = this.moduleNodes.get(endpoint.designator);
    if (!node) return;

    const key = `${endpoint.designator}:${endpoint.portId}`;
    const routeState = this.routeHighlightedPorts.get(key);

    if (hovered) {
      // While a route is pending, only legally connectable targets respond;
      // invalid ports stay idle (no size-up). Route targets keep their
      // valid/warning highlight instead of the plain hover style.
      if (this.contextTracker.isActive('schematic:routing') && !routeState) return;
      setPortHighlighted(node, endpoint.portId, routeState ?? 'hover');
      return;
    }

    if (routeState) {
      setPortHighlighted(node, endpoint.portId, routeState);
    } else if (this.warnedPorts.has(key)) {
      setPortWarning(node, endpoint.portId, true);
    } else {
      setPortHighlighted(node, endpoint.portId, 'idle');
    }
  }

  // ----------------------------------------------------------------- problems

  /**
   * Lints the live document and publishes the report: persistent warning
   * highlights for flagged nets/ports plus the host callback. Runs after
   * every committed change and once after an architecture loads.
   */
  private runLint(): void {
    if (this.mode !== 'editor') return;

    const issues = lintArchitecture({
      modules: this.getSerializedModules(),
      nets: this.allNets(),
    });
    this.applyProblemHighlights(issues);
    if (this.config.onProblemsChange) {
      this.config.onProblemsChange(issues);
    }
  }

  /** Maps lint refs onto persistent warning styles (diffed to avoid churn). */
  private applyProblemHighlights(issues: LintIssue[]): void {
    const nextNets = new Set<string>();
    const nextPorts = new Set<string>();
    for (const issue of issues) {
      if (issue.severity === 'info') continue;
      for (const ref of issue.refs ?? []) {
        const separator = ref.indexOf(':');
        if (separator !== -1) nextPorts.add(ref);
        else if (this.nets.has(ref)) nextNets.add(ref);
      }
    }

    for (const netId of nextNets) {
      if (!this.warnedNets.has(netId)) {
        this.warnedNets.add(netId);
        this.applyWireWarning(netId);
      }
    }
    for (const netId of Array.from(this.warnedNets)) {
      if (!nextNets.has(netId)) {
        this.warnedNets.delete(netId);
        this.applyWireWarning(netId);
      }
    }

    for (const key of nextPorts) {
      if (!this.warnedPorts.has(key)) {
        this.warnedPorts.add(key);
        this.setPortWarningVisual(key, true);
      }
    }
    for (const key of Array.from(this.warnedPorts)) {
      if (!nextPorts.has(key)) {
        this.warnedPorts.delete(key);
        this.setPortWarningVisual(key, false);
      }
    }
  }

  /** Restores a wire's persistent style: selection > lint warning > default. */
  private applyWireWarning(netId: string): void {
    const wire = this.wireNodes.get(netId);
    if (!wire) return;
    if (this.routeHighlightedNets.has(netId)) return; // route highlight wins
    if (this.selection.has(netId)) {
      setWireSelected(wire, true);
      return;
    }
    setWireWarningState(wire, this.warnedNets.has(netId));
  }

  /** Applies/clears a port's persistent warning ring (route states win). */
  private setPortWarningVisual(key: string, warned: boolean): void {
    if (this.routeHighlightedPorts.has(key)) return;
    const separator = key.indexOf(':');
    const designator = key.slice(0, separator);
    const portId = key.slice(separator + 1);
    const node = this.moduleNodes.get(designator);
    if (!node) return;
    setPortWarning(node, portId, warned);
  }

  /**
   * Focuses a lint issue: selects its first locatable element (the module
   * hosting a flagged port, a module, or a net) and centers the viewport.
   */
  public focusProblem(issue: LintIssue): void {
    for (const ref of issue.refs ?? []) {
      const separator = ref.indexOf(':');
      const elementId = separator === -1 ? ref : ref.slice(0, separator);

      const node = this.moduleNodes.get(elementId);
      if (node) {
        this.clearSelection();
        this.select(elementId);
        this.centerOnScene(node.x(), node.y());
        return;
      }

      const wire = this.wireNodes.get(elementId);
      if (wire) {
        const bounds = wire.getClientRect({ relativeTo: this.logicLayer });
        this.clearSelection();
        this.select(elementId);
        this.centerOnScene(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        return;
      }
    }
  }

  /** Pans the viewport so the given scene point sits at the canvas center. */
  private centerOnScene(x: number, y: number): void {
    const scale = this.stage.scaleX();
    this.stage.position({
      x: this.stage.width() / 2 - x * scale,
      y: this.stage.height() / 2 - y * scale,
    });
    this.notifyViewportChange();
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

  /**
   * Re-resolves every canvas color token after a light/dark switch. Nodes
   * bake their theme colors at creation, so each module and wire group is
   * rebuilt in place — layer order, transforms, selection, waypoint handles,
   * and persistent lint/route styling all restored — while the grid simply
   * re-renders. Pure re-styling: no document mutation, no notifications.
   */
  public refreshTheme(): void {
    this.gridManager.render();
    this.routingManager.refreshTheme();

    // Runtime port value labels were lifted out of their module groups into
    // the value layer; the fresh nodes carry hidden copies of their own.
    this.valueLayer.destroyChildren();

    for (const designator of Array.from(this.moduleNodes.keys())) {
      this.rebuildModuleNodeInPlace(designator);
    }

    for (const netId of Array.from(this.wireNodes.keys())) {
      const net = this.nets.get(netId);
      if (!net) continue;

      const stale = this.wireNodes.get(netId);
      if (!stale) continue;
      const fresh = createWireNode(netId, [], [], net.style ?? 'solid');
      this.logicLayer.add(fresh);
      stale.destroy();
      this.wireNodes.set(netId, fresh);
      this.attachWireInteractions(fresh, netId);
      this.recomposeNet(net);

      if (this.selection.has(netId)) {
        setWireSelected(fresh, true);
        this.showWireHandles(netId);
      } else {
        this.applyWireWarning(netId);
      }
    }

    // Persistent styling reapplied on the fresh nodes — route highlights
    // win over lint warning rings, mirroring clearRouteHighlights.
    for (const key of this.warnedPorts) {
      this.setPortWarningVisual(key, true);
    }
    for (const [key, state] of this.routeHighlightedPorts) {
      const separator = key.indexOf(':');
      const node = this.moduleNodes.get(key.slice(0, separator));
      if (node) setPortHighlighted(node, key.slice(separator + 1), state);
    }
    for (const [netId, state] of this.routeHighlightedNets) {
      const wire = this.wireNodes.get(netId);
      if (wire) setWireValidHighlight(wire, state);
    }

    this.logicLayer.batchDraw();
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
   * Applies new grid settings: redraws the grid. The snap unit is fixed
   * (`GRID_UNIT`) and never configurable, so no snapping consumer needs
   * re-targeting. Existing module positions are left untouched.
   */
  public applyGridSettings(settings: GridSettings): void {
    this.gridSettings = settings;
    this.gridManager.applySettings(settings);
  }

  /**
   * The snap increment used by every snapping consumer (module drags,
   * placement, routing waypoints, wire drags). Fixed and zoom-independent:
   * the grid's *visual* promotion never leaks into snapping.
   */
  private getGridSize(): number {
    return GRID_UNIT;
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
    this.notifyDocumentChange();
  }

  /**
   * Notifies the host of a committed document mutation (module or netlist
   * change). Suppressed while a saved architecture is being restored; the
   * lint report refreshes with every committed mutation.
   */
  private notifyDocumentChange(): void {
    if (this.loading) return;
    if (this.config.onDocumentChange) {
      this.config.onDocumentChange();
    }
    this.recordHistory();
    this.runLint();
  }

  /**
   * Pushes the pre-mutation state onto the undo stack and refreshes the
   * commit baseline. No-op mutations (e.g. a drop in place) refresh the
   * baseline without polluting history.
   */
  private recordHistory(): void {
    if (this.restoring) return;

    const next = this.captureHistoryEntry();
    if (this.historyBatching) {
      // The batch wrapper pushes its own single entry when it completes.
      this.historyBatchMutated = true;
      this.lastCommitted = next;
      return;
    }

    if (this.lastCommitted && !historyEntryEquals(this.lastCommitted, next)) {
      this.history.push(this.lastCommitted);
    }
    this.lastCommitted = next;
  }

  public destroy(): void {
    destroyTransientTooltip();
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

/** Numeric suffix of a designator like "u12" or "n3" (0 when absent). */
function idNumber(id: string): number {
  const match = /^(?:u|n)(\d+)$/.exec(id);
  return match ? parseInt(match[1], 10) : 0;
}

