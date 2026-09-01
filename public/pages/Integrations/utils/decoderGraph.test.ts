/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  buildDecoderGraph,
  decoderEdgeId,
  DecoderGraphInput,
  getDecoderHighlight,
  parseDecoderEdgeId,
} from './decoderGraph';

const ROOT = 'decoder/integrations/0';

/** root -> apache -> {access, error} */
const chain: DecoderGraphInput[] = [
  { id: ROOT, name: ROOT },
  { id: 'decoder/apache/0', name: 'decoder/apache/0', parents: [ROOT] },
  { id: 'decoder/apache-access/0', parents: ['decoder/apache/0'] },
  { id: 'decoder/apache-error/0', parents: ['decoder/apache/0'] },
];

const nodeById = (graph: ReturnType<typeof buildDecoderGraph>, id: string) => {
  const node = graph.nodes.find((candidate) => candidate.id === id);
  if (!node) {
    throw new Error(`expected node ${id}`);
  }
  return node;
};

describe('buildDecoderGraph', () => {
  it('returns an empty graph when the integration has no decoders', () => {
    expect(buildDecoderGraph([])).toEqual({ nodes: [], edges: [], backEdges: [] });
  });

  it('assigns depth as the distance from the root and marks the root decoder', () => {
    const graph = buildDecoderGraph(chain, ROOT);

    expect(nodeById(graph, ROOT).depth).toBe(0);
    expect(nodeById(graph, 'decoder/apache/0').depth).toBe(1);
    expect(nodeById(graph, 'decoder/apache-access/0').depth).toBe(2);
    expect(nodeById(graph, ROOT).role).toBe('root');
    expect(nodeById(graph, 'decoder/apache/0').role).toBe('member');
    expect(graph.backEdges).toEqual([]);
  });

  it('falls back to the decoder id when it has no name', () => {
    const graph = buildDecoderGraph(chain, ROOT);

    expect(nodeById(graph, 'decoder/apache-access/0').label).toBe('decoder/apache-access/0');
  });

  it('draws a decoder with several parents once, with an edge from each parent', () => {
    const graph = buildDecoderGraph(
      [
        ...chain,
        {
          id: 'decoder/http-fields/0',
          parents: ['decoder/apache-access/0', 'decoder/apache-error/0'],
        },
      ],
      ROOT
    );

    const shared = graph.nodes.filter((node) => node.id === 'decoder/http-fields/0');
    expect(shared).toHaveLength(1);
    expect(shared[0].parents).toEqual(['decoder/apache-access/0', 'decoder/apache-error/0']);
    // Longest path, not shortest: both parents sit at depth 2.
    expect(shared[0].depth).toBe(3);
  });

  it('uses the longest path when a decoder is reachable by two routes of different length', () => {
    const graph = buildDecoderGraph(
      [
        { id: ROOT },
        { id: 'a', parents: [ROOT] },
        { id: 'b', parents: ['a'] },
        { id: 'c', parents: [ROOT, 'b'] },
      ],
      ROOT
    );

    expect(nodeById(graph, 'c').depth).toBe(3);
  });

  it('surfaces a parent the integration does not own as an external decoder', () => {
    const graph = buildDecoderGraph(
      [...chain, { id: 'decoder/tls-alert/0', parents: ['decoder/tls-common/0'] }],
      ROOT
    );

    const external = nodeById(graph, 'decoder/tls-common/0');
    expect(external.role).toBe('external');
    expect(external.depth).toBe(0);
    expect(external.children).toEqual(['decoder/tls-alert/0']);
  });

  it('still marks the root decoder as the root when the integration does not own it', () => {
    // The space root decoder is normally outside the integration's decoder list.
    const graph = buildDecoderGraph([{ id: 'decoder/apache/0', parents: [ROOT] }], ROOT);

    expect(nodeById(graph, ROOT).role).toBe('root');
    expect(nodeById(graph, ROOT).depth).toBe(0);
  });

  it('ignores a decoder that declares itself as its own parent', () => {
    const graph = buildDecoderGraph([{ id: ROOT }, { id: 'a', parents: ['a', ROOT] }], ROOT);

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({ from: ROOT, to: 'a' });
  });

  it('collapses a parent declared twice into a single relationship', () => {
    const graph = buildDecoderGraph([{ id: ROOT }, { id: 'a', parents: [ROOT, ROOT] }], ROOT);

    expect(graph.edges).toHaveLength(1);
    expect(nodeById(graph, 'a').parents).toEqual([ROOT]);
  });

  it('breaks a parent cycle, keeps the remaining depths, and reports the dropped edge', () => {
    const graph = buildDecoderGraph(
      [
        { id: ROOT },
        { id: 'a', parents: [ROOT, 'c'] },
        { id: 'b', parents: ['a'] },
        { id: 'c', parents: ['b'] },
      ],
      ROOT
    );

    expect(graph.backEdges).toEqual([decoderEdgeId('c', 'a')]);
    expect(graph.edges.find((edge) => edge.id === decoderEdgeId('c', 'a'))!.back).toBe(true);
    // The rest of the cascade still lays out normally.
    expect(nodeById(graph, 'a').depth).toBe(1);
    expect(nodeById(graph, 'b').depth).toBe(2);
    expect(nodeById(graph, 'c').depth).toBe(3);
    expect(nodeById(graph, 'a').role).toBe('cycle');
  });

  it('terminates on a cycle with no entry point at all', () => {
    const graph = buildDecoderGraph([
      { id: 'a', parents: ['b'] },
      { id: 'b', parents: ['a'] },
    ]);

    expect(graph.backEdges).toHaveLength(1);
    expect(graph.nodes).toHaveLength(2);
  });

  it('records transitive ancestors and descendants without including the decoder itself', () => {
    const graph = buildDecoderGraph(chain, ROOT);
    const access = nodeById(graph, 'decoder/apache-access/0');

    expect(access.ancestors.sort()).toEqual(['decoder/apache/0', ROOT].sort());
    expect(access.descendants).toEqual([]);
    expect(nodeById(graph, ROOT).descendants).toHaveLength(3);
  });

  it('orders nodes by depth so the layout is stable between renders', () => {
    const forward = buildDecoderGraph(chain, ROOT);
    const reversed = buildDecoderGraph([...chain].reverse(), ROOT);

    expect(forward.nodes.map((node) => node.id)).toEqual(reversed.nodes.map((node) => node.id));
  });
});

describe('getDecoderHighlight', () => {
  const graph = buildDecoderGraph(
    [
      ...chain,
      {
        id: 'decoder/http-fields/0',
        parents: ['decoder/apache-access/0'],
      },
    ],
    ROOT
  );

  it('returns nothing when no decoder is being traced', () => {
    expect(getDecoderHighlight(graph)).toEqual({ nodes: new Set(), edges: new Set() });
  });

  it('returns nothing for a decoder that is not in the graph', () => {
    expect(getDecoderHighlight(graph, 'decoder/absent/0').nodes.size).toBe(0);
  });

  it('lights the traced decoder, its ancestors and its descendants', () => {
    const { nodes } = getDecoderHighlight(graph, 'decoder/apache-access/0');

    expect(Array.from(nodes).sort()).toEqual(
      [ROOT, 'decoder/apache/0', 'decoder/apache-access/0', 'decoder/http-fields/0'].sort()
    );
    // The sibling branch stays dim.
    expect(nodes.has('decoder/apache-error/0')).toBe(false);
  });

  it('lights only the relationships along the traced path', () => {
    const { edges } = getDecoderHighlight(graph, 'decoder/apache-access/0');

    expect(Array.from(edges).sort()).toEqual(
      [
        decoderEdgeId(ROOT, 'decoder/apache/0'),
        decoderEdgeId('decoder/apache/0', 'decoder/apache-access/0'),
        decoderEdgeId('decoder/apache-access/0', 'decoder/http-fields/0'),
      ].sort()
    );
  });
});

describe('parseDecoderEdgeId', () => {
  it('round-trips ids that contain the separator in neither endpoint', () => {
    expect(parseDecoderEdgeId(decoderEdgeId('decoder/a/0', 'decoder/b/0'))).toEqual({
      from: 'decoder/a/0',
      to: 'decoder/b/0',
    });
  });
});
