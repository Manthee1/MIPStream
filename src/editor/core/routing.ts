/** @format */

import Konva from "konva";
import { pointerScenePosition } from "./pointer";
import { GridManager } from "./grid";
import { composeNetPath } from "./render/orthogonal-path";
import { createPreviewWire } from "./render/wire";
import { isSameEndpoint } from "@/shared/utils/netlist";
import type { NetEndpoint } from "@/shared/types/netlist";
import type { Pos } from "@/shared/types/manifest";

/**
 * Either end of an interactive route: a module port, or a tap onto an
 * existing net (a junction point on its trunk/branch polyline).
 */
export type RoutePoint =
  | { kind: "port"; endpoint: NetEndpoint; position: Pos; node: Konva.Group }
  | { kind: "net"; netId: string; position: Pos };

export interface RoutingManagerOptions {
  /** Layer for the dashed routing preview (the interaction layer). */
  layer: Konva.Layer;
  /** Live base grid size (scene units) — allows settings changes mid-session. */
  getGridSize: () => number;
  /** Resolves a module port's current scene position. */
  getPortPosition: (designator: string, portId: string) => Pos | null;
  /** Resolves the tap point of a net closest to a scene position. */
  getNetJunction: (netId: string, scene: Pos) => Pos | null;
  /** Commits a finished route; returns true when accepted. */
  onCommit: (start: RoutePoint, waypoints: Pos[], end: RoutePoint) => boolean;
  /** Fired whenever interactive routing starts/ends. */
  onRoutingChange: (active: boolean) => void;
  /** Fired when a route begins; the designer highlights legal targets. */
  onRouteStart: (start: RoutePoint) => void;
  /** Fired when a route ends (commit/cancel); the designer clears highlights. */
  onRouteEnd: () => void;
  /** Applies/clears the hovered-port visual (the designer owns highlight state). */
  setPortHover: (endpoint: NetEndpoint, hovered: boolean) => void;
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

/** A hovered or clicked wire resolved from a `.wire-group` node. */
interface WireHit {
  netId: string;
  position: Pos;
}

/**
 * Interactive net routing engine.
 *
 * Active while the wire tool is selected. Hovering a port highlights it;
 * clicking a port starts routing (from an input OR an output); clicking an
 * existing wire starts routing from that net (or taps the net when finishing
 * from a free input port); empty-canvas clicks append grid-snapped waypoints;
 * clicking a second endpoint commits through `onCommit`, which the designer
 * validates against the 1-output : n-inputs rule.
 */
export class RoutingManager {
  private readonly stage: Konva.Stage;
  private readonly layer: Konva.Layer;
  private readonly options: RoutingManagerOptions;

  private enabled = false;
  private pending: { start: RoutePoint; waypoints: Pos[] } | null = null;
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

    const portHit = this.findPortHit();
    if (portHit) {
      if (this.pending) {
        this.finish({ kind: "port", ...portHit });
      } else {
        this.start({ kind: "port", ...portHit });
      }
      return;
    }

    const wireHit = this.findWireHit();
    if (wireHit) {
      if (this.pending) {
        // Net → net is never legal: every existing net already owns a driver.
        if (this.pending.start.kind === "net") return;
        this.finish({ kind: "net", ...wireHit });
      } else {
        this.start({ kind: "net", ...wireHit });
      }
      return;
    }

    // Empty canvas: append a grid-snapped waypoint to the route.
    if (!this.pending) return;
    const scene = pointerScenePosition(this.stage);
    if (!scene) return;

    this.pending.waypoints.push({
      x: GridManager.snap(scene.x, this.options.getGridSize()),
      y: GridManager.snap(scene.y, this.options.getGridSize()),
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
      this.options.setPortHover(this.hovered.endpoint, false);
      this.hovered = null;
    }

    if (this.pending) {
      this.pending = null;
      this.preview.points([]);
      this.options.onRouteEnd();
      this.options.onRoutingChange(false);
    }
  }

  public isActive(): boolean {
    return this.pending !== null;
  }

  // ----------------------------------------------------------------- private

  private start(start: RoutePoint): void {
    this.pending = { start, waypoints: [] };
    this.preview.points([start.position.x, start.position.y]);
    this.options.onRouteStart(start);
    this.options.onRoutingChange(true);
  }

  private finish(end: RoutePoint): void {
    if (!this.pending) return;
    const { start, waypoints } = this.pending;

    // Attempt the commit; routing ends either way (rejected routes drop).
    this.options.onCommit(start, waypoints, end);
    this.clearPending();
  }

  private clearPending(): void {
    this.pending = null;
    this.preview.points([]);
    this.options.onRouteEnd();
    this.options.onRoutingChange(false);
  }

  /** Highlights the port under the cursor, restoring the previously hovered one. */
  private updateHover(): void {
    const hit = this.findPortHit();

    if (this.hovered && (!hit || !isSameEndpoint(this.hovered.endpoint, hit.endpoint))) {
      this.options.setPortHover(this.hovered.endpoint, false);
      this.hovered = null;
    }

    if (hit && !this.hovered) {
      this.options.setPortHover(hit.endpoint, true);
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
        x: GridManager.snap(scene.x, this.options.getGridSize()),
        y: GridManager.snap(scene.y, this.options.getGridSize()),
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

  /** Resolves the net under the cursor and its closest tap point, or null. */
  private findWireHit(): WireHit | null {
    const pos = this.stage.getPointerPosition();
    if (!pos) return null;

    const shape = this.stage.getIntersection(pos);
    if (!shape) return null;

    // Only net polylines are valid taps (handles/junction dots excluded).
    const name = shape.name();
    if (name !== "wire-trunk" && name !== "wire-branch") return null;

    let node: Konva.Node | null = shape;
    while (node && node.name() !== "wire-group") {
      node = node.getParent();
    }
    if (!node) return null;

    const netId: unknown = node.getAttr("netId");
    if (typeof netId !== "string") return null;

    const scene = pointerScenePosition(this.stage);
    if (!scene) return null;

    const position = this.options.getNetJunction(netId, scene);
    if (!position) return null;

    return { netId, position };
  }
}

