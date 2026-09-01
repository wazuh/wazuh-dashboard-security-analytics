/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataStore } from '../../../store/DataStore';
import { buildDecoderGraph, DecoderGraph } from '../../Integrations/utils/decoderGraph';

/**
 * Upper bound on the decoders the graph fetches and draws. Past this a
 * node-link diagram stops being readable, and the table stays the way to
 * browse them.
 */
export const MAX_GRAPH_DECODERS = 500;

const EMPTY_GRAPH: DecoderGraph = { nodes: [], edges: [], backEdges: [] };

export interface UseIntegrationDecoderGraphParams {
  decoderIds: string[];
  space: string;
  /** The integration's `document.parent_decoder`, drawn as the entry point. */
  rootDecoderId?: string;
  enabled?: boolean;
}

export interface UseIntegrationDecoderGraphResult {
  graph: DecoderGraph;
  loading: boolean;
  error: boolean;
  /** The integration has more decoders than the graph will draw. */
  truncated: boolean;
  refresh: () => void;
}

/**
 * Loads every decoder of an integration together with `document.parents`, and
 * turns them into the graph the diagram draws. Unlike the table this cannot be
 * paginated — a partial page would produce a partial hierarchy.
 */
export function useIntegrationDecoderGraph({
  decoderIds,
  space,
  rootDecoderId,
  enabled = true,
}: UseIntegrationDecoderGraphParams): UseIntegrationDecoderGraphResult {
  const [graph, setGraph] = useState<DecoderGraph>(EMPTY_GRAPH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // The parent rebuilds `decoderIds` on every render, so depend on its content.
  const decoderIdsKey = useMemo(() => decoderIds.join(','), [decoderIds]);
  const truncated = decoderIds.length > MAX_GRAPH_DECODERS;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!decoderIds.length) {
      setGraph(EMPTY_GRAPH);
      setError(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    DataStore.decoders
      .searchDecoders(
        {
          from: 0,
          size: Math.min(decoderIds.length, MAX_GRAPH_DECODERS),
          query: {
            bool: {
              filter: [{ terms: { 'document.id': decoderIds.slice(0, MAX_GRAPH_DECODERS) } }],
            },
          },
          sort: [{ 'document.name': { order: 'asc' } }],
          _source: {
            includes: [
              'document.id',
              'document.name',
              'document.metadata.title',
              'document.parents',
            ],
          },
        },
        space
      )
      .then((response) => {
        if (cancelled) {
          return;
        }
        setGraph(
          buildDecoderGraph(
            response.items.map((item) => ({
              id: item.document?.id,
              name: item.document?.name,
              title: item.document?.metadata?.title,
              parents: item.document?.parents,
            })),
            rootDecoderId
          )
        );
      })
      .catch(() => {
        if (!cancelled) {
          setGraph(EMPTY_GRAPH);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decoderIdsKey, space, rootDecoderId, enabled, reloadTrigger]);

  const refresh = useCallback(() => {
    setReloadTrigger((previous) => previous + 1);
  }, []);

  return { graph, loading, error, truncated, refresh };
}
