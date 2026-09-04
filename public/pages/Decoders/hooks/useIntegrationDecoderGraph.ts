/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useMemo, useState } from 'react';
import { DataStore } from '../../../store/DataStore';
import { DecoderItem } from '../../../../types';
import {
  buildDecoderGraph,
  DecoderGraph,
  DecoderGraphInput,
} from '../../Integrations/utils/decoderGraph';

/**
 * Upper bound on the integration's own (owned) decoders the graph fetches and
 * draws. Past this a node-link diagram stops being readable, and the table
 * stays the way to browse them. External-parent resolution has its own,
 * independent cap — see MAX_EXTERNAL_DECODERS.
 */
export const MAX_GRAPH_DECODERS = 500;

/**
 * Upper bound on how many decoders outside the integration the cascade
 * resolves and draws. Independent of MAX_GRAPH_DECODERS, which only bounds
 * the integration's own decoder count — an integration close to that limit
 * would otherwise leave almost no budget for external-parent resolution
 * regardless of the hop cap below.
 */
export const MAX_EXTERNAL_DECODERS = 25;

/**
 * Upper bound on how many BFS passes external-parent resolution takes. Real
 * decoder hierarchies are shallow, so this only guards against a pathological
 * or maliciously long `parents` chain making unbounded round trips.
 */
export const MAX_EXTERNAL_HOPS = 25;

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
  reloadTrigger: number;
}

export interface UseIntegrationDecoderGraphResult {
  graph: DecoderGraph;
  loading: boolean;
  error: boolean;
  /** The integration has more decoders than the graph will draw. */
  truncated: boolean;
  /** The parent chain extends past what external-parent resolution could reach. */
  hierarchyTruncated: boolean;
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
 * Resolution runs in two stages, because the two ends of a relationship are
 * expressed differently: an integration lists its decoders by `document.id`,
 * while `document.parents` names them. The second stage resolves the parents
 * that aren't part of the integration — walking outward by name, one hop at a
 * time (BFS), for as many hops as it takes to reach the space root decoder.
 * A single hop isn't enough: the root is rarely a direct parent of an owned
 * decoder, so stopping after one pass leaves it (and anything between it and
 * the integration) as an id-less placeholder that can't be opened or
 * recognised as root.
 *
 * The root decoder itself comes from the space's policy, which is where it is
 * configured; the integration document does not carry one.
 *
 * A parent name is only ever drawn if it was actually searched for: one that
 * a resolved decoder references but that a cap stopped us from looking up is
 * left out of the graph entirely, rather than shown as "not found" — that
 * caption is reserved for a name we did search for and got nothing back.
 */
export function useIntegrationDecoderGraph({
  decoderIds,
  space,
  enabled = true,
  reloadTrigger,
}: UseIntegrationDecoderGraphParams): UseIntegrationDecoderGraphResult {
  const [graph, setGraph] = useState<DecoderGraph>(EMPTY_GRAPH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hierarchyTruncated, setHierarchyTruncated] = useState(false);

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
      setHierarchyTruncated(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    interface LoadResult {
      graph: DecoderGraph;
      hierarchyTruncated: boolean;
    }

    const load = async (): Promise<LoadResult> => {
      const [owned, rootDecoderId] = await Promise.all([
        searchByTerms('document.id', decoderIds.slice(0, MAX_GRAPH_DECODERS), space),
        loadRootDecoderId(space),
      ]);
      const inputs = owned.map((item) => toInput(item, false));

      const known = new Set(inputs.map((input) => input.name).filter(Boolean));
      const externalByName = new Map<string, DecoderGraphInput>();
      const attemptedNames = new Set<string>();

      let frontier = Array.from(
        new Set(
          inputs
            .flatMap((input) => input.parents ?? [])
            .filter((name) => Boolean(name) && !known.has(name))
        )
      );

      let hops = 0;
      while (
        frontier.length &&
        externalByName.size < MAX_EXTERNAL_DECODERS &&
        hops < MAX_EXTERNAL_HOPS
      ) {
        frontier.forEach((name) => attemptedNames.add(name));

        // eslint-disable-next-line no-await-in-loop
        const fetched = await searchByTerms('document.name', frontier, space);
        const nextFrontier = new Set<string>();

        fetched.forEach((item) => {
          const input = toInput(item, true);
          if (!input.name || externalByName.has(input.name)) {
            return;
          }
          externalByName.set(input.name, input);
          (input.parents ?? []).forEach((parentName) => {
            if (parentName && !known.has(parentName) && !externalByName.has(parentName)) {
              nextFrontier.add(parentName);
            }
          });
        });

        // A parent that resolves to nothing still gets a node, from the
        // relationship alone — buildDecoderGraph adds it. It simply has no id,
        // so it cannot be opened; resolution stops there rather than retrying.
        frontier = Array.from(nextFrontier);
        hops += 1;
      }

      // Anything still queued here was never looked up — the hop cap or the
      // external-decoder cap stopped resolution with more chain left to walk.
      const hierarchyTruncated = frontier.length > 0;

      // A referenced parent that was never actually searched for shouldn't be
      // drawn at all — buildDecoderGraph can't tell "we didn't look" from "we
      // looked and it doesn't exist" on its own, so strip those references
      // here. A name that was searched for and came back empty stays in
      // attemptedNames, so it keeps its usual "not found" placeholder.
      const resolvable = (name: string) =>
        known.has(name) || externalByName.has(name) || attemptedNames.has(name);
      const finalInputs = [...inputs, ...externalByName.values()].map((input) => ({
        ...input,
        parents: (input.parents ?? []).filter(resolvable),
      }));

      return {
        graph: buildDecoderGraph(finalInputs, rootDecoderId),
        hierarchyTruncated,
      };
    };

    load()
      .then((next) => {
        if (!cancelled) {
          setGraph(next.graph);
          setHierarchyTruncated(next.hierarchyTruncated);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGraph(EMPTY_GRAPH);
          setError(true);
          setHierarchyTruncated(false);
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

  return { graph, loading, error, truncated, hierarchyTruncated };
}
