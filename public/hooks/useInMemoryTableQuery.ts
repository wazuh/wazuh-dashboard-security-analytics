/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useMemo, useState } from 'react';
import { EuiSearchBar } from '@elastic/eui';
import { getActiveStatusValue, toggleStatusFilter } from '../utils/entitySearchBarFilters';

type Query = ReturnType<typeof EuiSearchBar.Query.parse>;

// Wazuh: how many items an EuiInMemoryTable shows for a query, across every page. It
// runs the same Query.execute the table runs; a null query (a search that failed to
// parse) filters nothing, as in the table.
export const countQueryMatches = <T>(query: Query | null, items: T[]): number =>
  query ? EuiSearchBar.Query.execute(query, items).length : items.length;

// Wazuh: makes an EuiInMemoryTable's search query controlled, so the status summary bar
// can apply the Status filter, and counts what the table shows. `onQueryChange` keeps
// the page's own side effects (persisting the query in the URL); it receives null for
// a search that failed to parse, as the table's `search.onChange` did before.
export function useInMemoryTableQuery<T>(
  initialQueryText: string,
  items: T[],
  onQueryChange: (query: Query | null) => void,
  statusField: string = 'status'
) {
  const [searchQuery, setSearchQuery] = useState<Query>(() =>
    EuiSearchBar.Query.parse(initialQueryText)
  );
  // The query the table filters with: the last valid one, or null after a parse error.
  const [appliedQuery, setAppliedQuery] = useState<Query | null>(searchQuery);

  const onSearchChange = useCallback(
    ({ query }: { query: Query | null }) => {
      setAppliedQuery(query ?? null);
      if (query) {
        setSearchQuery(query);
      }
      onQueryChange(query ?? null);
      return true;
    },
    [onQueryChange]
  );

  const toggleStatus = useCallback(
    (value: string) => {
      const next = toggleStatusFilter(searchQuery, value, statusField);
      setSearchQuery(next);
      setAppliedQuery(next);
      onQueryChange(next);
    },
    [searchQuery, statusField, onQueryChange]
  );

  // Replaces the query without touching the URL, e.g. after the page cleared its params.
  const resetQuery = useCallback((text: string = '') => {
    const next = EuiSearchBar.Query.parse(text);
    setSearchQuery(next);
    setAppliedQuery(next);
  }, []);

  const matchCount = useMemo(() => countQueryMatches(appliedQuery, items), [appliedQuery, items]);

  return {
    searchQuery,
    onSearchChange,
    toggleStatus,
    resetQuery,
    matchCount,
    activeStatus: getActiveStatusValue(searchQuery, statusField),
  };
}
