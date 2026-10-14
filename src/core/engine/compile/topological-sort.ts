/** @format */

/**
 * Kahn's algorithm for ordering the combinational dependency graph
 * (ENGINE_SPEC §2). Sequential modules never enter the graph — their outputs
 * are boundary conditions held in the wire buffer between clock edges.
 */

/** A directed dependency edge: `from` must evaluate before `to`. */
export interface TopoEdge {
  from: string;
  to: string;
}

export interface TopologicalSortResult {
  /** Acyclic evaluation order. */
  order: string[];
  /** Ids stuck on a cycle (empty when the graph is acyclic). */
  cyclic: string[];
}

/** Sorts `ids` by dependency edges; duplicate edges are tolerated. */
export function topologicalSort(ids: string[], edges: TopoEdge[]): TopologicalSortResult {
  const indegree = new Map<string, number>();
  const successors = new Map<string, string[]>();
  for (const id of ids) {
    indegree.set(id, 0);
    successors.set(id, []);
  }

  for (const edge of edges) {
    if (!indegree.has(edge.from) || !indegree.has(edge.to)) continue;
    successors.get(edge.from)!.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const ready: string[] = [];
  for (const [id, degree] of indegree) {
    if (degree === 0) ready.push(id);
  }

  const order: string[] = [];
  let cursor = 0;
  while (cursor < ready.length) {
    const id = ready[cursor++];
    order.push(id);
    for (const next of successors.get(id) ?? []) {
      const degree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, degree);
      if (degree === 0) ready.push(next);
    }
  }

  const cyclic = ids.filter((id) => (indegree.get(id) ?? 0) > 0);
  return { order, cyclic };
}
