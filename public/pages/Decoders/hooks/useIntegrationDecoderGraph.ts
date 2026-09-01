/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataStore } from '../../../store/DataStore';
import { DecoderItem } from '../../../../types';
import {
  buildDecoderGraph,
  DecoderGraph,
  DecoderGraphInput,
} from '../../Integrations/utils/decoderGraph';

/**
 * Upper bound on the decoders the graph fetches and draws. Past this a
 * node-link diagram stops being readable, and the table stays the way to
 * browse them.
 */
export const MAX_GRAPH_DECODERS = 500;

const EMPTY_GRAPH: DecoderGraph = { nodes: [], edges: [], backEdges: [] };

const GRAPH_SOURCE_FIELDS = [
  'document.id',
  'document.name',
  'document.metadata.title',
  'document.parents',
];

export interface UseIntegrationDecoderGraphParams {
  decoderIds: string[];
  space: string;
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

const toInput = (item: DecoderItem, external: boolean): DecoderGraphInput => ({
  name: item.document?.name,
  decoderId: item.document?.id,
  title: item.document?.metadata?.title,
  parents: item.document?.parents,
  external,
});

/**
 * The root decoder is a property of the space, not of the integration: it lives
 * on the policy document as `root_decoder`, holding a decoder id, and is set
 * through the same picker `EditPolicy` uses. `searchPolicies` reports its own
 * failures and resolves to an empty result, so a missing policy costs the
 * cascade its root marker and nothing else.
 */
const loadRootDecoderId = async (space: string): Promise<string | undefined> => {
  const response = await DataStore.policies.searchPolicies(space, {});
  return response.items?.[0]?.document?.root_decoder || undefined;
};

const searchByTerms = async (
  field: 'document.id' | 'document.name',
  values: string[],
  space: string
): Promise<DecoderItem[]> => {
  const response = await DataStore.decoders.searchDecoders(
    {
      from: 0,
      size: values.length,
      query: { bool: { filter: [{ terms: { [field]: values } }] } },
      sort: [{ 'document.name': { order: 'asc', unmapped_type: 'keyword' } }],
      _source: { includes: GRAPH_SOURCE_FIELDS },
    },
    space
  );
  return response.items;
};

/**
 * Loads every decoder of an integration together with `document.parents`, and
 * turns them into the graph the diagram draws. Unlike the table this cannot be
 * paginated — a partial page would produce a partial hierarchy.
 *
 * It takes two passes, because the two ends of a relationship are expressed
 * differently: an integration lists its decoders by `document.id`, while
 * `document.parents` names them. The second pass resolves the parents that
 * aren't part of the integration — the space root decoder, most of all — so
 * they carry their own id and can be opened like any other node.
 *
 * The root decoder itself comes from the space's policy, which is where it is
 * configured; the integration document does not carry one.
 */
export function useIntegrationDecoderGraph({
  decoderIds,
  space,
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

    const load = async (): Promise<DecoderGraph> => {
      const [owned, rootDecoderId] = await Promise.all([
        searchByTerms('document.id', decoderIds.slice(0, MAX_GRAPH_DECODERS), space),
        loadRootDecoderId(space),
      ]);
      const inputs = owned.map((item) => toInput(item, false));

      const known = new Set(inputs.map((input) => input.name).filter(Boolean));
      const unresolved = Array.from(
        new Set(
          inputs
            .flatMap((input) => input.parents ?? [])
            .filter((name) => Boolean(name) && !known.has(name))
        )
      );

      // A parent that resolves to nothing still gets a node, from the
      // relationship alone — buildDecoderGraph adds it. It simply has no id, so
      // it cannot be opened.
      const external = unresolved.length
        ? (await searchByTerms('document.name', unresolved, space)).map((item) =>
            toInput(item, true)
          )
        : [];

      return buildDecoderGraph([...inputs, ...external], rootDecoderId);
    };

    load()
      .then((next) => {
        if (!cancelled) {
          setGraph(next);
        }
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
  }, [decoderIdsKey, space, enabled, reloadTrigger]);

  const refresh = useCallback(() => {
    setReloadTrigger((previous) => previous + 1);
  }, []);

  return { graph, loading, error, truncated, refresh };
}
