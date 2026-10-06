/** @format */

import Konva from "konva";
import { pointerScenePosition } from "./pointer";
import { GridManager } from "./grid";
import { composeNetPath } from "./render/orthogonal-path";
import { createPreviewWire } from "./render/wire";
import { setPortHighlighted } from "./render/module-node";
import { isSameEndpoint } from "@/shared/utils/netlist";
import type { NetEndpoint } from "@/shared/types/netlist";
import type { Pos } from "@/shared/types/manifest";

export interface RoutingManagerOptions {
  /** Layer for the dashed routing preview (the interaction layer). */
  layer: Konva.Layer;
  gridSize: number;
  /** Resolves a module port's current scene position. */
  getPortPosition: (designator: string, portId: string) => Pos | null;
  /** Commits a finished net; returns true when accepted. */
  onCommit: (start: NetEndpoint, waypoints: Pos[], end: NetEndpoint) => boolean;
  /** Fired whenever interactive routing starts/ends. */
  onRoutingChange: (active: boolean) => void;
  /** Routing is editor-only; gates all interaction when false. */
  isEnabled: () => boolean;
}

/** A hovered or clicked port resolved from a `.port-hit` shape. */
interface PortHit {
  endpoint: NetEndpoint;
  position: Pos;
  /** The module node group, for highlight control. */
  node: Konva.Group;
}

/**
 * Interactive net routing engine.
 *
 * Active while the wire tool is selected. Hovering a port highlights it;
 * clicking a port starts routing (from an input OR an output); empty-canvas
 * clicks append grid-snapped waypoints; clicking a second port commits the
 * net through `onCommit` (the designer validates and orients it).
 */
export class RoutingManager {
  private readonly stage: Konva.Stage;
  private readonly layer: Konva.Layer;
  private readonly options: RoutingManagerOptions;

  private enabled = false;
  private pending: { start: PortHit; waypoints: Pos[] } | null = null;
  private hovered: PortHit | null = null;
  private readonly preview = createPreviewWire();

  private readonly mouseMoveHandler = () => {
    if (!this.enabled || !this.options.isEnabled()) return;

    this.updateHover();
    this.updatePreview();
  };

  private readonly clickHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this.enabled || !this.options.isEnabled()) return;
    // Left button only; right-button click ends a pan gesture.
    if (e.evt.button !== 0) return;

    const hit = this.findPortHit();
    if (hit) {
      if (this.pending) {
        this.finish(hit);
      } else {
        this.start(hit);
      }
      return;
    }

    // Empty canvas: append a grid-snapped waypoint to the route.
    if (!this.pending) return;
    const scene = pointerScenePosition(this.stage);
    if (!scene) return;

    this.pending.waypoints.push({
      x: GridManager.snap(scene.x, this.options.gridSize),
      y: GridManager.snap(scene.y, this.options.gridSize),
    });
    this.updatePreview();
  };

  constructor(stage: Konva.Stage, options: RoutingManagerOptions) {
    this.stage = stage;
    this.options = options;
    this.layer = options.layer;
    this.layer.add(this.preview);
  }

  /** Attaches/detaches interaction handlers; disabling cancels any route. */
  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;

    if (enabled) {
      this.stage.on("mousemove", this.mouseMoveHandler);
      this.stage.on("click", this.clickHandler);
    } else {
      this.cancel();
      this.stage.off("mousemove", this.mouseMoveHandler);
      this.stage.off("click", this.clickHandler);
    }
  }

  /** Cancels the active route and clears all transient state. */
  public cancel(): void {
    if (this.hovered) {
      setPortHighlighted(this.hovered.node, this.hovered.endpoint.portId, false);
      this.hovered = null;
    }

    if (this.pending) {
      this.pending = null;
      this.preview.points([]);
      this.options.onRoutingChange(false);
    }
  }

  public isActive(): boolean {
    return this.pending !== null;
  }

  // ----------------------------------------------------------------- private

  private start(hit: PortHit): void {
    this.pending = { start: hit, waypoints: [] };
    this.preview.points([hit.position.x, hit.position.y]);
    this.options.onRoutingChange(true);
  }

  private finish(hit: PortHit): void {
    if (!this.pending) return;
    const { start, waypoints } = this.pending;

    // Attempt the commit; routing ends either way (rejected nets simply drop).
    this.options.onCommit(start.endpoint, waypoints, hit.endpoint);
    this.clearPending();
  }

  private clearPending(): void {
    this.pending = null;
    this.preview.points([]);
    this.options.onRoutingChange(false);
  }

  /** Highlights the port under the cursor, restoring the previously hovered one. */
  private updateHover(): void {
    const hit = this.findPortHit();

    if (this.hovered && (!hit || !isSameEndpoint(this.hovered.endpoint, hit.endpoint))) {
      setPortHighlighted(this.hovered.node, this.hovered.endpoint.portId, false);
      this.hovered = null;
    }

    if (hit && !this.hovered) {
      setPortHighlighted(hit.node, hit.endpoint.portId, true);
      this.hovered = hit;
    }
  }

  /** Re-draws the dashed preview from the route start through waypoints to the cursor. */
  private updatePreview(): void {
    if (!this.pending) return;

    const scene = pointerScenePosition(this.stage);
    if (!scene) return;

    this.preview.points(
      composeNetPath(this.pending.start.position, this.pending.waypoints, {
        x: GridManager.snap(scene.x, this.options.gridSize),
        y: GridManager.snap(scene.y, this.options.gridSize),
      })
    );
  }

  /** Resolves the port under the cursor, or null. */
  private findPortHit(): PortHit | null {
    const pos = this.stage.getPointerPosition();
    if (!pos) return null;

    const shape = this.stage.getIntersection(pos);
    if (!shape || shape.name() !== "port-hit") return null;

    // Walk up to the owning module node.
    let node: Konva.Node | null = shape;
    while (node && node.name() !== "module-node") {
      node = node.getParent();
    }
    if (!node) return null;

    const designator: unknown = node.getAttr("designator");
    const portId: unknown = shape.getAttr("portId");
    if (typeof designator !== "string" || typeof portId !== "string") return null;

    const position = this.options.getPortPosition(designator, portId);
    if (!position) return null;

    return {
      endpoint: { designator, portId },
      position,
      node: node as Konva.Group,
    };
  }
}

