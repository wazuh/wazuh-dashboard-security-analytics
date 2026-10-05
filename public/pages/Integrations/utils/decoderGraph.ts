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

/**
 * A decoder reduced to what the graph needs.
 *
 * Decoders carry two identifiers and they are not interchangeable:
 * `document.id` is a UUID assigned by the backend, while `document.name` is the
 * `decoder/<name>/<version>` string. **`document.parents` references names** —
 * the YAML author has no UUID to write at authoring time — so the graph joins
 * on the name and keeps the UUID alongside for whoever needs to fetch the
 * decoder itself.
 */
export interface DecoderGraphInput {
  /** `document.name`; the key `parents` joins on. */
  name: string;
  /** `document.id`; absent when the decoder itself was never fetched. */
  decoderId?: string;
  title?: string;
  parents?: string[];
  /**
   * The decoder was resolved only because something referenced it as a parent —
   * it is not one of the integration's own decoders.
   */
  external?: boolean;
}

export type DecoderNodeRole = 'root' | 'member' | 'external' | 'cycle';

export interface DecoderGraphNode {
  /** The decoder name, which is what relationships are expressed in. */
  id: string;
  /** `document.id`, for fetching the decoder. Absent for an unresolved parent. */
  decoderId?: string;
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
  decoderId?: string;
  label: string;
  title?: string;
  external: boolean;
  parents: string[];
  children: string[];
  layoutParents: string[];
  layoutChildren: string[];
}

const EMPTY_GRAPH: DecoderGraph = { nodes: [], edges: [], backEdges: [] };

/**
 * @param decoders the decoders of the integration, plus any parent already resolved
 * @param rootDecoderRef the integration's `document.parent_decoder`. Matched
 *   against both identifiers: integrations reference decoders by UUID, but
 *   accepting the name too keeps this correct either way.
 */
export function buildDecoderGraph(
  decoders: DecoderGraphInput[],
  rootDecoderRef?: string
): DecoderGraph {
  if (!decoders.length) {
    return EMPTY_GRAPH;
  }

  const byName = new Map<string, WorkingNode>();
  const addNode = (name: string, external: boolean, source?: DecoderGraphInput) => {
    byName.set(name, {
      id: name,
      decoderId: source?.decoderId,
      label: name,
      title: source?.title,
      external,
      parents: [],
      children: [],
      layoutParents: [],
      layoutChildren: [],
    });
  };

  decoders.forEach((decoder) => {
    if (decoder.name && !byName.has(decoder.name)) {
      addNode(decoder.name, !!decoder.external, decoder);
    }
  });

  const edges: DecoderGraphEdge[] = [];
  const seenEdges = new Set<string>();

  decoders.forEach((decoder) => {
    const child = byName.get(decoder.name);
    if (!child) {
      return;
    }
    (decoder.parents ?? []).forEach((parentName) => {
      if (!parentName || parentName === decoder.name) {
        return;
      }
      if (!byName.has(parentName)) {
        // A parent the integration doesn't own — the space root decoder, or a
        // decoder from another integration. Surface it so the link stays visible.
        addNode(parentName, true);
      }
      const id = decoderEdgeId(parentName, decoder.name);
      if (seenEdges.has(id)) {
        return;
      }
      seenEdges.add(id);
      edges.push({ id, from: parentName, to: decoder.name, back: false });
      byName.get(parentName)!.children.push(decoder.name);
      child.parents.push(parentName);
    });
  });

  byName.forEach((node) => {
    node.parents.sort();
    node.children.sort();
  });

  const backEdges = findBackEdges(byName);
  edges.forEach((edge) => {
    edge.back = backEdges.has(edge.id);
  });

  // The layout runs on the graph without the back edges, so a malformed
  // `parents` entry can't collapse every depth to zero.
  edges.forEach((edge) => {
    if (edge.back) {
      return;
    }
    byName.get(edge.from)!.layoutChildren.push(edge.to);
    byName.get(edge.to)!.layoutParents.push(edge.from);
  });

  const depth = computeDepth(byName);
  const cycleTargets = new Set(Array.from(backEdges).map((id) => parseDecoderEdgeId(id).to));

  const nodes: DecoderGraphNode[] = Array.from(byName.values()).map((node) => ({
    id: node.id,
    decoderId: node.decoderId,
    label: node.label,
    title: node.title,
    role: resolveRole(node, rootDecoderRef, cycleTargets),
    depth: depth.get(node.id) ?? 0,
    parents: node.parents,
    children: node.children,
    ancestors: Array.from(reach(byName, node.id, 'parents')),
    descendants: Array.from(reach(byName, node.id, 'children')),
  }));

  nodes.sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));

  return { nodes, edges, backEdges: Array.from(backEdges).sort() };
}

function resolveRole(
  node: WorkingNode,
  rootDecoderRef: string | undefined,
  cycleTargets: Set<string>
): DecoderNodeRole {
  // The root wins over `external`: the space root decoder usually isn't part of
  // the integration's own decoder list, but it's still the entry point. The
  // reference may be either identifier, so match on both.
  if (rootDecoderRef && (node.decoderId === rootDecoderRef || node.id === rootDecoderRef)) {
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
function findBackEdges(byName: Map<string, WorkingNode>): Set<string> {
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const colour = new Map<string, number>();
  byName.forEach((_node, id) => colour.set(id, WHITE));
  const backEdges = new Set<string>();

  const visit = (startId: string) => {
    // Explicit stack: decoder hierarchies are shallow, but recursion on
    // attacker-supplied content is worth avoiding.
    const stack: Array<{ id: string; index: number }> = [{ id: startId, index: 0 }];
    colour.set(startId, GREY);

    while (stack.length) {
      const frame = stack[stack.length - 1];
      const node = byName.get(frame.id)!;
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

  const ids = Array.from(byName.keys()).sort();
  ids
    .filter((id) => byName.get(id)!.parents.length === 0)
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
function computeDepth(byName: Map<string, WorkingNode>): Map<string, number> {
  const indegree = new Map<string, number>();
  byName.forEach((node, id) => indegree.set(id, node.layoutParents.length));

  const ready = Array.from(byName.keys())
    .filter((id) => indegree.get(id) === 0)
    .sort();
  const depth = new Map<string, number>();
  byName.forEach((_node, id) => depth.set(id, 0));

  while (ready.length) {
    const id = ready.shift()!;
    byName.get(id)!.layoutChildren.forEach((childId) => {
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
  byName: Map<string, WorkingNode>,
  startId: string,
  direction: 'parents' | 'children'
): Set<string> {
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop()!;
    byName.get(id)![direction].forEach((neighbourId) => {
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
