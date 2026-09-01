/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Builds the parent/child graph of the decoders of an integration.
 *
 * `document.parents` is an array, so the result is a rooted DAG rather than a
 * tree: two decoders that both descend from the root can declare the same child.
 * The layout therefore works in layers — `depth` is the longest path from a
 * source node and feeds vis-network's `level`.
 */

/** A decoder reduced to what the graph needs. */
export interface DecoderGraphInput {
  id: string;
  name?: string;
  title?: string;
  parents?: string[];
}

export type DecoderNodeRole = 'root' | 'member' | 'external' | 'cycle';

export interface DecoderGraphNode {
  id: string;
  /** Decoder name when known, the id otherwise. */
  label: string;
  title?: string;
  role: DecoderNodeRole;
  /** Longest path from a source node. */
  depth: number;
  parents: string[];
  children: string[];
  /** Everything this decoder descends from / feeds, transitively. */
  ancestors: string[];
  descendants: string[];
}

export interface DecoderGraphEdge {
  id: string;
  from: string;
  to: string;
  /** Declared parent that would close a loop; excluded from the layout. */
  back: boolean;
}

export interface DecoderGraph {
  nodes: DecoderGraphNode[];
  edges: DecoderGraphEdge[];
  /** Ids of the relationships dropped to keep the layout acyclic. */
  backEdges: string[];
}

export const decoderEdgeId = (from: string, to: string): string => `${from}|${to}`;

/** Splits an edge id back into its endpoints, for messages about broken cycles. */
export const parseDecoderEdgeId = (id: string): { from: string; to: string } => {
  const separator = id.indexOf('|');
  return { from: id.slice(0, separator), to: id.slice(separator + 1) };
};

interface WorkingNode {
  id: string;
  label: string;
  title?: string;
  external: boolean;
  parents: string[];
  children: string[];
  layoutParents: string[];
  layoutChildren: string[];
}

const EMPTY_GRAPH: DecoderGraph = { nodes: [], edges: [], backEdges: [] };

export function buildDecoderGraph(
  decoders: DecoderGraphInput[],
  rootDecoderId?: string
): DecoderGraph {
  if (!decoders.length) {
    return EMPTY_GRAPH;
  }

  const byId = new Map<string, WorkingNode>();
  const addNode = (id: string, external: boolean, source?: DecoderGraphInput) => {
    byId.set(id, {
      id,
      label: source?.name || id,
      title: source?.title,
      external,
      parents: [],
      children: [],
      layoutParents: [],
      layoutChildren: [],
    });
  };

  decoders.forEach((decoder) => {
    if (decoder.id && !byId.has(decoder.id)) {
      addNode(decoder.id, false, decoder);
    }
  });

  const edges: DecoderGraphEdge[] = [];
  const seenEdges = new Set<string>();

  decoders.forEach((decoder) => {
    const child = byId.get(decoder.id);
    if (!child) {
      return;
    }
    (decoder.parents ?? []).forEach((parentId) => {
      if (!parentId || parentId === decoder.id) {
        return;
      }
      if (!byId.has(parentId)) {
        // A parent the integration doesn't own — the space root decoder, or a
        // decoder from another integration. Surface it so the link stays visible.
        addNode(parentId, true);
      }
      const id = decoderEdgeId(parentId, decoder.id);
      if (seenEdges.has(id)) {
        return;
      }
      seenEdges.add(id);
      edges.push({ id, from: parentId, to: decoder.id, back: false });
      byId.get(parentId)!.children.push(decoder.id);
      child.parents.push(parentId);
    });
  });

  byId.forEach((node) => {
    node.parents.sort();
    node.children.sort();
  });

  const backEdges = findBackEdges(byId);
  edges.forEach((edge) => {
    edge.back = backEdges.has(edge.id);
  });

  // The layout runs on the graph without the back edges, so a malformed
  // `parents` entry can't collapse every depth to zero.
  edges.forEach((edge) => {
    if (edge.back) {
      return;
    }
    byId.get(edge.from)!.layoutChildren.push(edge.to);
    byId.get(edge.to)!.layoutParents.push(edge.from);
  });

  const depth = computeDepth(byId);
  const cycleTargets = new Set(Array.from(backEdges).map((id) => parseDecoderEdgeId(id).to));

  const nodes: DecoderGraphNode[] = Array.from(byId.values()).map((node) => ({
    id: node.id,
    label: node.label,
    title: node.title,
    role: resolveRole(node, rootDecoderId, cycleTargets),
    depth: depth.get(node.id) ?? 0,
    parents: node.parents,
    children: node.children,
    ancestors: Array.from(reach(byId, node.id, 'parents')),
    descendants: Array.from(reach(byId, node.id, 'children')),
  }));

  nodes.sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));

  return { nodes, edges, backEdges: Array.from(backEdges).sort() };
}

function resolveRole(
  node: WorkingNode,
  rootDecoderId: string | undefined,
  cycleTargets: Set<string>
): DecoderNodeRole {
  // The root wins over `external`: the space root decoder usually isn't part of
  // the integration's own decoder list, but it's still the entry point.
  if (rootDecoderId && node.id === rootDecoderId) {
    return 'root';
  }
  if (cycleTargets.has(node.id)) {
    return 'cycle';
  }
  if (node.external) {
    return 'external';
  }
  return 'member';
}

/**
 * Depth-first pass marking the edges that close a loop. Sorting the entry
 * points keeps the choice of broken edge stable across renders.
 */
function findBackEdges(byId: Map<string, WorkingNode>): Set<string> {
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const colour = new Map<string, number>();
  byId.forEach((_node, id) => colour.set(id, WHITE));
  const backEdges = new Set<string>();

  const visit = (startId: string) => {
    // Explicit stack: decoder hierarchies are shallow, but recursion on
    // attacker-supplied content is worth avoiding.
    const stack: Array<{ id: string; index: number }> = [{ id: startId, index: 0 }];
    colour.set(startId, GREY);

    while (stack.length) {
      const frame = stack[stack.length - 1];
      const node = byId.get(frame.id)!;
      if (frame.index >= node.children.length) {
        colour.set(frame.id, BLACK);
        stack.pop();
        continue;
      }
      const childId = node.children[frame.index];
      frame.index += 1;
      const childColour = colour.get(childId);
      if (childColour === GREY) {
        backEdges.add(decoderEdgeId(frame.id, childId));
      } else if (childColour === WHITE) {
        colour.set(childId, GREY);
        stack.push({ id: childId, index: 0 });
      }
    }
  };

  const ids = Array.from(byId.keys()).sort();
  ids
    .filter((id) => byId.get(id)!.parents.length === 0)
    .forEach((id) => {
      if (colour.get(id) === WHITE) {
        visit(id);
      }
    });
  ids.forEach((id) => {
    if (colour.get(id) === WHITE) {
      visit(id);
    }
  });

  return backEdges;
}

/** Longest path from a source node, over the graph without its back edges. */
function computeDepth(byId: Map<string, WorkingNode>): Map<string, number> {
  const indegree = new Map<string, number>();
  byId.forEach((node, id) => indegree.set(id, node.layoutParents.length));

  const ready = Array.from(byId.keys())
    .filter((id) => indegree.get(id) === 0)
    .sort();
  const depth = new Map<string, number>();
  byId.forEach((_node, id) => depth.set(id, 0));

  while (ready.length) {
    const id = ready.shift()!;
    byId.get(id)!.layoutChildren.forEach((childId) => {
      depth.set(childId, Math.max(depth.get(childId)!, depth.get(id)! + 1));
      const remaining = indegree.get(childId)! - 1;
      indegree.set(childId, remaining);
      if (remaining === 0) {
        ready.push(childId);
        ready.sort();
      }
    });
  }

  return depth;
}

/** Transitive closure in one direction. The seen set makes it cycle-safe. */
function reach(
  byId: Map<string, WorkingNode>,
  startId: string,
  direction: 'parents' | 'children'
): Set<string> {
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop()!;
    byId.get(id)![direction].forEach((neighbourId) => {
      if (!seen.has(neighbourId)) {
        seen.add(neighbourId);
        stack.push(neighbourId);
      }
    });
  }
  seen.delete(startId);
  return seen;
}

/**
 * The decoders and relationships to keep lit when tracing `decoderId`: itself,
 * everything it descends from, and everything it feeds.
 */
export function getDecoderHighlight(
  graph: DecoderGraph,
  decoderId?: string
): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  if (!decoderId) {
    return { nodes, edges };
  }
  const node = graph.nodes.find((candidate) => candidate.id === decoderId);
  if (!node) {
    return { nodes, edges };
  }

  const up = new Set([decoderId, ...node.ancestors]);
  const down = new Set([decoderId, ...node.descendants]);
  up.forEach((id) => nodes.add(id));
  down.forEach((id) => nodes.add(id));

  graph.edges.forEach((edge) => {
    if ((up.has(edge.from) && up.has(edge.to)) || (down.has(edge.from) && down.has(edge.to))) {
      edges.add(edge.id);
    }
  });

  return { nodes, edges };
}
