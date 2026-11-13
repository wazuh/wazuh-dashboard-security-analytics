/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback } from 'react';
import { DataStore } from '../store/DataStore';
import { EntityStatusValue, useStatusCounts, UseStatusCountsOptions } from './useStatusCounts';

/** The server-paginated entities whose tables show the status summary bar. */
export type StatusCountEntity = 'decoders' | 'rules' | 'kvdbs';

export interface EntityStatusScope {
  space: string;
  /** Limits the counts to these documents, e.g. the decoders of one integration. */
  ids?: string[];
}

// Wazuh: how many items of an entity have a status, in a scope (space, and on an
// integration's page its documents), never the table's search or filters. A size-0
// search per status reuses the server's own Status filter definition. The request
// shows no toast: the list's own request reports a failure once, and this one throws
// so the bar shows no counts instead of a partial split.
export const countEntityByStatus = async (
  entity: StatusCountEntity,
  status: EntityStatusValue,
  { space, ids }: EntityStatusScope
): Promise<number> => {
  const idsFilter = ids ? [{ terms: { 'document.id': ids } }] : [];
  let response: { total: number; error?: string };

  switch (entity) {
    case 'decoders':
      response = await DataStore.decoders.searchDecoders(
        {
          from: 0,
          size: 0,
          query: idsFilter[0] ?? { match_all: {} },
          status,
          _source: false,
        },
        space,
        { silent: true }
      );
      break;
    case 'rules':
      response = await DataStore.rules.searchRules(
        { query: idsFilter[0] ?? { match_all: {} }, from: 0, size: 0, status, _source: false },
        space,
        { silent: true }
      );
      break;
    case 'kvdbs': {
      // The KVDBs search route takes the space as a query clause, not a parameter.
      const filter: object[] = [...idsFilter];
      if (space) {
        filter.push({ term: { 'space.name': space } });
      }
      response = await DataStore.kvdbs.searchKVDBs(
        {
          size: 0,
          query: filter.length ? { bool: { filter } } : { match_all: {} },
          status,
          track_total_hits: true,
          _source: false,
        },
        { skipIntegrationMap: true, silent: true }
      );
      break;
    }
  }

  if (response.error) {
    throw new Error(response.error);
  }
  return response.total;
};

// Wazuh: the enabled/disabled split of a server-paginated table, for the status summary
// bar. `counts` is undefined while loading and after a failed request.
export function useEntityStatusCounts(
  entity: StatusCountEntity,
  { space, ids }: EntityStatusScope,
  options: UseStatusCountsOptions = {}
) {
  // Callers rebuild `ids` on every render, so depend on its content.
  const idsKey = ids?.join(',');
  const countByStatus = useCallback(
    (status: EntityStatusValue) => countEntityByStatus(entity, status, { space, ids }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entity, space, idsKey]
  );
  return useStatusCounts(countByStatus, options);
}
