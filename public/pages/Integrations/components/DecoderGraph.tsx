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
import {
  DECODER_LEGEND_ITEMS,
  DecoderGraphPalette,
  getDecoderNodeCaption,
  getDecoderNodeStyle,
} from '../utils/decoderGraphStyle';
import { ListEmptyPrompt } from '../../../components/ListEmptyPrompt';

export interface DecoderGraphProps {
  graph: DecoderGraphModel;
  loading: boolean;
  error: boolean;
  /** The integration has more decoders than the diagram draws. */
  truncated: boolean;
  maxDecoders: number;
  /** The parent chain extends past what external-parent resolution could reach. */
  hierarchyTruncated: boolean;
  onSelectDecoder: (decoderId: string) => void;
  height?: number;
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
  root: euiThemeVars.euiColorAccent,
  member: euiThemeVars.euiColorPrimary,
  external: euiThemeVars.euiColorDarkShade,
  cycle: euiThemeVars.euiColorWarning,
  edge: euiThemeVars.euiColorMediumShade,
  text: euiThemeVars.euiTextColor,
  fontFamily: euiThemeVars.euiCodeFontFamily,
});

const toVisNode = (node: DecoderGraphNode, palette: DecoderGraphPalette, lit: boolean): Node => {
  const { colour, borderWidth, dashed } = getDecoderNodeStyle(node, palette);
  const caption = getDecoderNodeCaption(node);
  return {
    id: node.id,
    label: caption ? `${node.label}\n${caption}` : node.label,
    level: node.depth,
    shape: 'box',
    borderWidth,
    borderWidthSelected: borderWidth,
    shapeProperties: {
      borderDashes: dashed ? [5, 3] : false,
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

/**
 * The key for the cascade. Each swatch is drawn from the same style rule as the
 * node it stands for, so the two cannot drift apart.
 */
const DecoderGraphLegend: React.FC<{ palette: DecoderGraphPalette }> = ({ palette }) => (
  <ul
    aria-label="Decoder cascade key"
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px 16px',
      margin: 0,
      padding: 0,
      listStyle: 'none',
    }}
  >
    {DECODER_LEGEND_ITEMS.map((item) => {
      const { colour, borderWidth, dashed } = getDecoderNodeStyle(item.subject, palette);
      return (
        <li
          key={item.id}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
          data-test-subj={`decoder-graph-legend-${item.id}`}
        >
          <span
            aria-hidden="true"
            style={{
              width: 22,
              height: 13,
              flex: 'none',
              borderRadius: 3,
              background: palette.surface,
              border: `${borderWidth}px ${dashed ? 'dashed' : 'solid'} ${colour}`,
            }}
          />
          <EuiText size="xs" color="subdued">
            {item.label}
          </EuiText>
        </li>
      );
    })}
  </ul>
);

export const DecoderGraph: React.FC<DecoderGraphProps> = ({
  graph,
  loading,
  error,
  truncated,
  maxDecoders,
  hierarchyTruncated,
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
      click: (params: any) => {
        const [nodeId] = params?.nodes ?? [];
        // Nodes are keyed by decoder name, because that is what `parents`
        // references — but the details flyout fetches by `document.id`. A parent
        // that resolved to no decoder has no id, and cannot be opened.
        const decoder = graph.nodes.find((candidate) => candidate.id === nodeId);
        if (decoder?.decoderId) {
          onSelectDecoder(decoder.decoderId);
        }
      },
    }),
    [graph, trace, onSelectDecoder]
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

      {hierarchyTruncated && (
        <>
          <EuiCallOut
            title="Part of the decoder hierarchy wasn't loaded"
            color="warning"
            iconType="iInCircle"
            size="s"
            data-test-subj="decoder-graph-hierarchy-truncated-callout"
          >
            <p>
              This integration has more external parent decoders than the cascade resolves, so part
              of the chain above it isn't shown.
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

      <DecoderGraphLegend palette={palette} />
      <EuiSpacer size="s" />

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
