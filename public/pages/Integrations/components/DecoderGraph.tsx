/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Graph, { DataSet, Edge, GraphEvents, Node, Options } from 'react-graph-vis';
import 'vis-network/dist/dist/vis-network.min.css';
import { EuiCallOut, EuiLoadingChart, EuiSpacer, EuiText } from '@elastic/eui';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';
import {
  DecoderGraph as DecoderGraphModel,
  DecoderGraphEdge,
  DecoderGraphNode,
  getDecoderHighlight,
  parseDecoderEdgeId,
} from '../utils/decoderGraph';
import { blendColor } from '../utils/blendColor';
import { ListEmptyPrompt } from '../../../components/ListEmptyPrompt';

export interface DecoderGraphProps {
  graph: DecoderGraphModel;
  loading: boolean;
  error: boolean;
  /** The integration has more decoders than the diagram draws. */
  truncated: boolean;
  maxDecoders: number;
  onSelectDecoder: (decoderId: string) => void;
  height?: number;
}

interface DecoderGraphPalette {
  surface: string;
  member: string;
  external: string;
  cycle: string;
  edge: string;
  text: string;
  fontFamily: string;
}

/** How far a dimmed element is blended into the surface while tracing a path. */
const DIM = 0.75;

/**
 * Colours come from the EUI theme vars. `@osd/ui-shared-deps/theme` resolves
 * those to the light or the dark set from the dashboard's own theme tag, so the
 * diagram follows the theme selected in the Wazuh dashboard with no prop of its
 * own. Read them per render rather than at module load, so a test or a host
 * that swaps the theme gets the current values.
 */
const getPalette = (): DecoderGraphPalette => ({
  surface: euiThemeVars.euiColorEmptyShade,
  member: euiThemeVars.euiColorPrimary,
  external: euiThemeVars.euiColorDarkShade,
  cycle: euiThemeVars.euiColorWarning,
  edge: euiThemeVars.euiColorMediumShade,
  text: euiThemeVars.euiTextColor,
  fontFamily: euiThemeVars.euiCodeFontFamily,
});

const roleColour = (node: DecoderGraphNode, palette: DecoderGraphPalette): string => {
  if (node.role === 'external') {
    return palette.external;
  }
  if (node.role === 'cycle') {
    return palette.cycle;
  }
  return palette.member;
};

/**
 * The second line of a node. The role never rests on colour alone — the
 * blue/grey pair is only ~12 ΔE apart in both EUI themes, so the caption and
 * the dashed border are what actually carry the distinction.
 */
const nodeCaption = (node: DecoderGraphNode): string => {
  switch (node.role) {
    case 'root':
      return 'root decoder';
    case 'external':
      return 'outside this integration';
    case 'cycle':
      return 'parent cycle';
    default:
      return node.parents.length > 1 ? `${node.parents.length} parents` : node.title ?? '';
  }
};

const toVisNode = (node: DecoderGraphNode, palette: DecoderGraphPalette, lit: boolean): Node => {
  const colour = roleColour(node, palette);
  const caption = nodeCaption(node);
  return {
    id: node.id,
    label: caption ? `${node.label}\n${caption}` : node.label,
    level: node.depth,
    shape: 'box',
    borderWidth: node.role === 'root' ? 3 : 1,
    borderWidthSelected: node.role === 'root' ? 3 : 2,
    shapeProperties: {
      borderDashes: node.role === 'external' ? [5, 3] : false,
      borderRadius: 4,
    },
    margin: { top: 8, right: 12, bottom: 8, left: 12 },
    widthConstraint: { maximum: 260 },
    color: {
      background: palette.surface,
      border: lit ? colour : blendColor(colour, palette.surface, DIM),
      highlight: { background: palette.surface, border: colour },
      hover: { background: palette.surface, border: colour },
    },
    font: {
      color: lit ? palette.text : blendColor(palette.text, palette.surface, DIM),
      face: palette.fontFamily,
      size: 12,
      align: 'left',
      multi: false,
    },
  };
};

const toVisEdge = (edge: DecoderGraphEdge, palette: DecoderGraphPalette, lit: boolean): Edge => {
  const resting = edge.back ? palette.cycle : palette.edge;
  const colour = lit ? palette.member : blendColor(resting, palette.surface, DIM);
  return {
    id: edge.id,
    from: edge.from,
    to: edge.to,
    width: lit ? 2 : 1,
    dashes: edge.back ? [5, 3] : false,
    color: { color: colour, highlight: palette.member, hover: palette.member, inherit: false },
    arrows: { to: { enabled: true, scaleFactor: 0.45 } },
    smooth: { enabled: true, type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.55 },
  };
};

export const DecoderGraph: React.FC<DecoderGraphProps> = ({
  graph,
  loading,
  error,
  truncated,
  maxDecoders,
  onSelectDecoder,
  height = 520,
}) => {
  const nodesRef = useRef<DataSet<Node> | undefined>();
  const edgesRef = useRef<DataSet<Edge> | undefined>();
  const palette = useMemo(getPalette, []);

  const initialGraph = useMemo(
    () => ({
      nodes: graph.nodes.map((node) => toVisNode(node, palette, true)),
      edges: graph.edges.map((edge) => toVisEdge(edge, palette, true)),
    }),
    [graph, palette]
  );

  const trace = useCallback(
    (decoderId?: string) => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      if (!nodes || !edges) {
        return;
      }
      const { nodes: litNodes, edges: litEdges } = getDecoderHighlight(graph, decoderId);
      const tracing = litNodes.size > 0;
      nodes.update(
        graph.nodes.map((node) => toVisNode(node, palette, !tracing || litNodes.has(node.id)))
      );
      edges.update(
        graph.edges.map((edge) => toVisEdge(edge, palette, !tracing || litEdges.has(edge.id)))
      );
    },
    [graph, palette]
  );

  // A new decoder set means new DataSets; drop any trace left from the old one.
  useEffect(() => {
    trace(undefined);
  }, [trace]);

  const events: GraphEvents = useMemo(
    () => ({
      hoverNode: (params: any) => trace(params?.node),
      blurNode: () => trace(undefined),
      selectNode: (params: any) => {
        const [decoderId] = params?.nodes ?? [];
        if (decoderId) {
          onSelectDecoder(decoderId);
        }
      },
    }),
    [trace, onSelectDecoder]
  );

  const options: Options = useMemo(
    () => ({
      autoResize: true,
      height: '100%',
      width: '100%',
      layout: {
        // The decoders form a rooted DAG, not a tree: `sortMethod: 'directed'`
        // lays it out in layers and draws a decoder with several parents once,
        // with an edge coming in from each of them. `level` carries the depth
        // computed in buildDecoderGraph so both stay in step.
        hierarchical: {
          enabled: true,
          direction: 'LR',
          sortMethod: 'directed',
          levelSeparation: 260,
          nodeSpacing: 70,
          treeSpacing: 100,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
          shakeTowards: 'roots',
        },
      },
      physics: { enabled: false },
      interaction: {
        hover: true,
        dragNodes: false,
        dragView: true,
        zoomView: true,
        zoomSpeed: 0.3,
        selectConnectedEdges: false,
        tooltipDelay: 200,
        keyboard: { enabled: true, bindToWindow: false },
      },
      nodes: { shape: 'box' },
    }),
    []
  );

  if (loading) {
    return (
      <div
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        data-test-subj="decoder-graph-loading"
      >
        <EuiLoadingChart size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        title="The decoder cascade could not be loaded"
        color="danger"
        iconType="alert"
        data-test-subj="decoder-graph-error"
      >
        <p>Refresh to try again, or switch to the table view to browse the decoders.</p>
      </EuiCallOut>
    );
  }

  if (!graph.nodes.length) {
    return (
      <ListEmptyPrompt
        entity="decoders"
        hasFilters={false}
        searchOnly
        noContentTitle="This integration has no decoders"
        emptyBody={null}
      />
    );
  }

  return (
    <div data-test-subj="decoder-graph">
      {truncated && (
        <>
          <EuiCallOut
            title={`Showing the first ${maxDecoders} decoders`}
            color="warning"
            iconType="iInCircle"
            size="s"
          >
            <p>
              This integration has more decoders than the cascade can draw legibly. Switch to the
              table view to browse all of them.
            </p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}

      {graph.backEdges.length > 0 && (
        <>
          <EuiCallOut
            title={
              graph.backEdges.length === 1 ? 'Parent cycle detected' : 'Parent cycles detected'
            }
            color="warning"
            iconType="alert"
            size="s"
            data-test-subj="decoder-graph-cycle-callout"
          >
            <p>
              {graph.backEdges
                .map((edgeId) => {
                  const { from, to } = parseDecoderEdgeId(edgeId);
                  return `${to} lists ${from} as a parent, but it already descends from it`;
                })
                .join('; ')}
              . {graph.backEdges.length === 1 ? 'That relationship is' : 'Those relationships are'}{' '}
              drawn dashed and left out of the layout.
            </p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}

      <div style={{ height }}>
        <Graph
          identifier="sa-integration-decoder-cascade"
          graph={initialGraph}
          options={options}
          events={events}
          getNodes={(nodes) => {
            nodesRef.current = nodes;
          }}
          getEdges={(edges) => {
            edgesRef.current = edges;
          }}
        />
      </div>

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>
          Hover a decoder to trace it back to the root and forward through everything it feeds.
          Select one to open its details. Scroll to zoom, drag to pan.
        </p>
      </EuiText>
    </div>
  );
};
