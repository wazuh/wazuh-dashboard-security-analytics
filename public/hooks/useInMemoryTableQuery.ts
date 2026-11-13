/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
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
//
// The page index is controlled too: the table goes back to the first page when the
// user types a search or loads new items, but not when the `query` prop changes, so a
// status picked in the bar would leave the user on page N of the filtered result. Pass
// `pageIndex` in the table's `pagination` and `onTableChange` as its `onTableChange`.
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
  const [pageIndex, setPageIndex] = useState(0);

  // New items send the table back to the first page, as it does with uncontrolled paging.
  useEffect(() => {
    setPageIndex(0);
  }, [items]);

  const onTableChange = useCallback(({ page }: { page?: { index: number } }) => {
    if (page) {
      setPageIndex(page.index);
    }
  }, []);

  const onSearchChange = useCallback(
    ({ query }: { query: Query | null }) => {
      setAppliedQuery(query ?? null);
      if (query) {
        setSearchQuery(query);
      }
      setPageIndex(0);
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
      setPageIndex(0);
      onQueryChange(next);
    },
    [searchQuery, statusField, onQueryChange]
  );

  // Replaces the query without touching the URL, e.g. after the page cleared its params.
  const resetQuery = useCallback((text: string = '') => {
    const next = EuiSearchBar.Query.parse(text);
    setSearchQuery(next);
    setAppliedQuery(next);
    setPageIndex(0);
  }, []);

  const matchCount = useMemo(() => countQueryMatches(appliedQuery, items), [appliedQuery, items]);

  return {
    searchQuery,
    onSearchChange,
    toggleStatus,
    resetQuery,
    matchCount,
    // From the query the table filters with: after a parse error it shows every item,
    // so no status is active.
    activeStatus: appliedQuery ? getActiveStatusValue(appliedQuery, statusField) : undefined,
    pageIndex,
    onTableChange,
  };
}
