/** @format */

import Konva from "konva";
import { GridManager } from "./grid";
import { pointerScenePosition } from "./pointer";
import type { Pos } from "@/shared/types/manifest";
import type { SerializedNet } from "@/shared/types/netlist";
import {
  collapsePolylineVertices,
  distanceToSegment,
} from "@/shared/utils/geometry";

export interface WireDragManagerOptions {
  /** Live base grid size (scene units) — allows settings changes mid-session. */
  getGridSize: () => number;
  /** Resolves a net's committed data (for validation and cloning). */
  getNet: (netId: string) => SerializedNet | null;
  /** Resolves a net's rendered polylines (scene space). */
  getNetGeometry: (netId: string) => NetGeometry | null;
  /** Live Alt-key state (free-form drag modifier, like module drags). */
  isAltPressed: () => boolean;
  /** Live re-render from a draft net while a segment drag is in flight. */
  onDragUpdate: (netId: string, draft: SerializedNet) => void;
  /** Commits the dragged geometry into the netlist on drag end. */
  onDragCommit: (netId: string, draft: SerializedNet) => void;
  /** Gates all interaction (editor mode + select tool). */
  isEnabled: () => boolean;
}

/** Rendered polylines of a net, indexed in branch order. */
export interface NetGeometry {
  trunk: number[];
  branches: number[][];
}

/** Polyline vertex with its anchor semantics (port / junction = fixed). */
interface TaggedVertex {
  pos: Pos;
  fixed: boolean;
}

interface DragState {
  netId: string;
  kind: "trunk" | "branch";
  branchIndex: number;
  vertices: TaggedVertex[];
  /** Dragged segment runs vertices[segIndex] → vertices[segIndex + 1]. */
  segIndex: number;
  /** Axis the segment moves along (perpendicular to the segment). */
  axis: "x" | "y";
  /** Original coordinate on `axis` before the drag. */
  startCoord: number;
  /** Pointer scene position recorded at drag start. */
  startPointer: Pos;
  /**
   * Free-form (Alt) mode: the grabbed segment follows the cursor in both
   * axes with no auto-inserted orthogonal bends — diagonal legs allowed.
   * Fixed at grab time (Alt state or the polyline already being free-form).
   */
  freeform: boolean;
  /** Start positions of the dragged segment's two vertices. */
  segmentStart: [Pos, Pos];
  /** Trunk branches whose junction dot sits on the dragged segment. */
  junctionBranches: number[];
  /** Start positions of those riding junction dots, by branch index. */
  junctionStarts: Map<number, Pos>;
  /** Whether bend vertices for fixed endpoints have been inserted. */
  bendsInserted: boolean;
  /** Working copy of the net mutated during the drag. */
  draft: SerializedNet;
}

const EPSILON = 0.51;

/**
 * KiCad-style wire segment dragging: grabbing a straight segment of a net
 * (trunk or fan-out branch) and dragging it pushes the segment perpendicular
 * to itself. Neighboring segments stretch to follow; where the neighbor is a
 * fixed anchor (a port or a junction), a new bend is inserted automatically
 * so the path stays orthogonal. Junction dots sitting on the dragged segment
 * ride along with it.
 *
 * Holding Alt — or dragging a polyline that is already free-form — switches
 * to free-form mode: the grabbed segment follows the cursor in both axes
 * with no bend insertion, so diagonal legs are allowed and the net keeps
 * rendering verbatim after the drag (`freeform` on the net/branch).
 */
export class WireDragManager {
  private readonly stage: Konva.Stage;
  private readonly options: WireDragManagerOptions;

  private enabled = false;
  private drag: DragState | null = null;

  constructor(stage: Konva.Stage, options: WireDragManagerOptions) {
    this.stage = stage;
    this.options = options;
  }

  /** Attaches/detaches interaction handlers (select tool lifecycle). */
  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;

    if (enabled) {
      this.stage.on("mousedown", this.mouseDownHandler);
      this.stage.on("mousemove", this.mouseMoveHandler);
      window.addEventListener("mouseup", this.mouseUpHandler);
    } else {
      this.drag = null;
      this.stage.off("mousedown", this.mouseDownHandler);
      this.stage.off("mousemove", this.mouseMoveHandler);
      window.removeEventListener("mouseup", this.mouseUpHandler);
    }
  }

  private readonly mouseDownHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this.enabled || !this.options.isEnabled()) return;
    if (e.evt.button !== 0) return;
    if (this.drag) return;

    const target: Konva.Node = e.target;
    const name = target.name();
    if (name !== "wire-trunk" && name !== "wire-branch") return;

    let node: Konva.Node | null = target;
    while (node && node.name() !== "wire-group") node = node.getParent();
    if (!node) return;
    const netId: unknown = node.getAttr("netId");
    if (typeof netId !== "string") return;

    const scene = pointerScenePosition(this.stage);
    if (!scene) return;

    const net = this.options.getNet(netId);
    const geometry = this.options.getNetGeometry(netId);
    if (!net || !geometry) return;

    const kind: DragState["kind"] = name === "wire-trunk" ? "trunk" : "branch";
    const rawBranchIndex = target.getAttr("branchIndex");
    const branchIndex =
      kind === "branch" && typeof rawBranchIndex === "number" ? rawBranchIndex : -1;
    const points = kind === "trunk" ? geometry.trunk : geometry.branches[branchIndex];
    if (!points || points.length < 4) return;

    const vertices = polylineToVertices(points);
    if (vertices.length < 2) return;

    const { segIndex } = findNearestSegment(scene, vertices);
    if (segIndex < 0) return;

    const a = vertices[segIndex].pos;
    const b = vertices[segIndex + 1].pos;
    if (a.x === b.x && a.y === b.y) return; // degenerate segment

    // Horizontal segments drag vertically (axis y), vertical ones horizontally.
    const axis: DragState["axis"] = a.y === b.y ? "y" : "x";

    // Free-form (Alt) mode: explicitly requested, or the polyline already
    // carries diagonal geometry from a previous free-form drag.
    const polylineFreeform =
      kind === "trunk" ? net.freeform === true : net.branches?.[branchIndex]?.freeform === true;
    const freeform = polylineFreeform || this.options.isAltPressed();

    // Trunk drags carry junction dots sitting on the dragged segment.
    const junctionBranches: number[] = [];
    const junctionStarts = new Map<number, Pos>();
    if (kind === "trunk") {
      net.branches?.forEach((branch, index) => {
        // Distance test covers axis-aligned AND diagonal (free-form) segments.
        if (distanceToSegment(branch.junction, a, b) < EPSILON) {
          junctionBranches.push(index);
          junctionStarts.set(index, { ...branch.junction });
        }
      });
    }

    this.drag = {
      netId,
      kind,
      branchIndex,
      vertices,
      segIndex,
      axis,
      startCoord: axis === "y" ? a.y : a.x,
      startPointer: scene,
      freeform,
      segmentStart: [
        { ...vertices[segIndex].pos },
        { ...vertices[segIndex + 1].pos },
      ],
      junctionBranches,
      junctionStarts,
      bendsInserted: false,
      draft: cloneNet(net),
    };

    if (freeform) {
      // The draft must render verbatim from the first move, and the commit
      // must persist the free-form rendering mode.
      if (kind === "trunk") {
        this.drag.draft.freeform = true;
      } else if (this.drag.draft.branches?.[branchIndex]) {
        this.drag.draft.branches[branchIndex].freeform = true;
      }
    }
  };

  private readonly mouseMoveHandler = () => {
    const state = this.drag;
    if (!state) return;

    const scene = pointerScenePosition(this.stage);
    if (!scene) return;

    if (state.freeform) {
      this.applyFreeFormDrag(state, scene);
      return;
    }

    const delta =
      state.axis === "y"
        ? scene.y - state.startPointer.y
        : scene.x - state.startPointer.x;
    const newCoord = GridManager.snap(state.startCoord + delta, this.options.getGridSize());

    this.applyDrag(state, newCoord);
  };

  private readonly mouseUpHandler = () => {
    const state = this.drag;
    if (!state) return;
    this.drag = null;
    this.options.onDragCommit(state.netId, state.draft);
  };

  // ----------------------------------------------------------------- private

  /**
   * Moves the dragged segment to `newCoord` along its perpendicular axis,
   * inserting bends for fixed anchors on the first move so the polyline
   * remains orthogonal. The mutated geometry is serialized into the draft and
   * pushed to the designer for live re-rendering.
   */
  private applyDrag(state: DragState, newCoord: number): void {
    if (!state.bendsInserted) {
      this.insertBends(state);
      state.bendsInserted = true;
    }

    const i = state.segIndex;
    state.vertices[i].pos[state.axis] = newCoord;
    state.vertices[i + 1].pos[state.axis] = newCoord;

    // Junction dots riding on the dragged trunk segment follow it.
    for (const branchIndex of state.junctionBranches) {
      const branch = state.draft.branches?.[branchIndex];
      if (branch) branch.junction[state.axis] = newCoord;
    }

    this.updateDraftWaypoints(state);
    this.options.onDragUpdate(state.netId, state.draft);
  }

  /**
   * Free-form (Alt) drag: the grabbed segment follows the cursor in both
   * axes with NO auto-inserted orthogonal bends — adjacent legs may go
   * diagonal. Fixed anchors (ports/junctions) stay glued; a movable vertex
   * is spliced in at each fixed end on the first move so the anchor is not
   * detached. Junction dots riding the trunk segment translate with it.
   */
  private applyFreeFormDrag(state: DragState, scene: Pos): void {
    if (!state.bendsInserted) {
      this.insertFreeFormAnchors(state);
      // After splicing, the dragged segment's vertices start at the anchor
      // positions — capture them as the translation origin.
      state.segmentStart = [
        { ...state.vertices[state.segIndex].pos },
        { ...state.vertices[state.segIndex + 1].pos },
      ];
      state.bendsInserted = true;
    }

    const snap = this.options.getGridSize();
    const dx = GridManager.snap(scene.x - state.startPointer.x, snap);
    const dy = GridManager.snap(scene.y - state.startPointer.y, snap);

    const [a, b] = state.segmentStart;
    const i = state.segIndex;
    if (!state.vertices[i].fixed) {
      state.vertices[i].pos = { x: a.x + dx, y: a.y + dy };
    }
    if (!state.vertices[i + 1].fixed) {
      state.vertices[i + 1].pos = { x: b.x + dx, y: b.y + dy };
    }

    // Junction dots riding the dragged trunk segment translate with it.
    for (const [branchIndex, start] of state.junctionStarts) {
      const branch = state.draft.branches?.[branchIndex];
      if (branch) branch.junction = { x: start.x + dx, y: start.y + dy };
    }

    this.updateDraftWaypoints(state);
    this.options.onDragUpdate(state.netId, state.draft);
  }

  /**
   * Free-form variant of `insertBends`: a movable vertex is spliced in at
   * each fixed end of the dragged segment so the anchor stays glued while
   * the vertex translates with the cursor (the leg may go diagonal).
   */
  private insertFreeFormAnchors(state: DragState): void {
    const vertices = state.vertices;

    if (vertices[state.segIndex].fixed) {
      vertices.splice(state.segIndex + 1, 0, {
        pos: { ...vertices[state.segIndex].pos },
        fixed: false,
      });
      state.segIndex += 1;
    }

    if (vertices[state.segIndex + 1].fixed) {
      vertices.splice(state.segIndex + 1, 0, {
        pos: { ...vertices[state.segIndex + 1].pos },
        fixed: false,
      });
    }
  }

  /**
   * Inserts movable bend vertices so the dragged segment no longer touches a
   * fixed anchor (port or junction) directly. The inserted vertices start
   * coincident with the anchors and are pushed by the drag.
   */
  private insertBends(state: DragState): void {
    const vertices = state.vertices;

    if (vertices[state.segIndex].fixed) {
      vertices.splice(state.segIndex + 1, 0, {
        pos: { ...vertices[state.segIndex].pos },
        fixed: false,
      });
      state.segIndex += 1;
    }

    if (vertices[state.segIndex + 1].fixed) {
      vertices.splice(state.segIndex + 1, 0, {
        pos: { ...vertices[state.segIndex + 1].pos },
        fixed: false,
      });
    }
  }

  /**
   * Serializes the dragged vertex list back into draft waypoints: fixed
   * anchors (ports / junctions) are dropped — they are recomputed from live
   * port positions — and collinear middles are collapsed.
   */
  private updateDraftWaypoints(state: DragState): void {
    const inner = state.vertices.slice();
    if (inner.length > 0 && inner[0].fixed) inner.shift();
    if (inner.length > 0 && inner[inner.length - 1].fixed) inner.pop();

    const waypoints = collapsePolylineVertices(
      inner.map((vertex) => ({ ...vertex.pos }))
    );

    if (state.kind === "trunk") {
      state.draft.waypoints = waypoints.length > 0 ? waypoints : undefined;
    } else {
      const branch = state.draft.branches?.[state.branchIndex];
      if (branch) branch.waypoints = waypoints.length > 0 ? waypoints : undefined;
    }
  }
}

/** Converts a flat polyline into tagged vertices; the ends are fixed anchors. */
function polylineToVertices(points: number[]): TaggedVertex[] {
  const collapsed = collapsePolylineVertices(
    pointsToVertices(points).map((vertex) => vertex.pos)
  );
  return collapsed.map((pos, index) => ({
    pos,
    fixed: index === 0 || index === collapsed.length - 1,
  }));
}

function pointsToVertices(points: number[]): TaggedVertex[] {
  const vertices: TaggedVertex[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    vertices.push({ pos: { x: points[i], y: points[i + 1] }, fixed: false });
  }
  return vertices;
}

function findNearestSegment(
  p: Pos,
  vertices: TaggedVertex[]
): { segIndex: number; distance: number } {
  let segIndex = -1;
  let best = Infinity;

  for (let i = 0; i + 1 < vertices.length; i++) {
    const distance = distanceToSegment(p, vertices[i].pos, vertices[i + 1].pos);
    if (distance < best) {
      best = distance;
      segIndex = i;
    }
  }

  return { segIndex, distance: best };
}

/** Deep-copies a net's routing geometry (connectivity is shared by reference). */
function cloneNet(net: SerializedNet): SerializedNet {
  return {
    ...net,
    waypoints: net.waypoints?.map((waypoint) => ({ ...waypoint })),
    branches: net.branches?.map((branch) => ({
      ...branch,
      junction: { ...branch.junction },
      waypoints: branch.waypoints?.map((waypoint) => ({ ...waypoint })),
    })),
  };
}
