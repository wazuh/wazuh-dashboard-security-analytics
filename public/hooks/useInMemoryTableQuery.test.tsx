/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { EuiSearchBar } from '@elastic/eui';
import { countQueryMatches, useInMemoryTableQuery } from './useInMemoryTableQuery';

const items = [
  { title: 'aws', status: 'enabled' },
  { title: 'azure', status: 'disabled' },
  { title: 'gcp', status: 'disabled' },
];

type HookResult = ReturnType<typeof useInMemoryTableQuery>;

const renderUseInMemoryTableQuery = (initialText: string, onQueryChange = jest.fn()) => {
  const result: { current: HookResult | undefined } = { current: undefined };
  const Harness = () => {
    result.current = useInMemoryTableQuery(initialText, items, onQueryChange);
    return null;
  };
  render(<Harness />);
  return { result, onQueryChange };
};

describe('countQueryMatches', () => {
  it('counts what the query matches, and everything without a query', () => {
    expect(countQueryMatches(EuiSearchBar.Query.parse('status=disabled'), items)).toBe(2);
    expect(countQueryMatches(EuiSearchBar.Query.parse('aws'), items)).toBe(1);
    expect(countQueryMatches(null, items)).toBe(3);
  });
});

describe('useInMemoryTableQuery', () => {
  it('starts from the given query text', () => {
    const { result } = renderUseInMemoryTableQuery('status=disabled');

    expect(result.current?.matchCount).toBe(2);
    expect(result.current?.activeStatus).toBe('disabled');
  });

  it('applies a status, then clears it on a second click, persisting each step', () => {
    const { result, onQueryChange } = renderUseInMemoryTableQuery('');

    act(() => result.current?.toggleStatus('enabled'));
    expect(result.current?.activeStatus).toBe('enabled');
    expect(result.current?.matchCount).toBe(1);
    expect(onQueryChange).toHaveBeenLastCalledWith(result.current?.searchQuery);

    act(() => result.current?.toggleStatus('enabled'));
    expect(result.current?.activeStatus).toBeUndefined();
    expect(result.current?.matchCount).toBe(3);
    expect(onQueryChange).toHaveBeenCalledTimes(2);
  });

  it('follows the search bar, and filters nothing after a parse error', () => {
    const { result, onQueryChange } = renderUseInMemoryTableQuery('');
    const query = EuiSearchBar.Query.parse('azure');

    act(() => {
      result.current?.onSearchChange({ query });
    });
    expect(result.current?.matchCount).toBe(1);
    expect(onQueryChange).toHaveBeenLastCalledWith(query);

    act(() => {
      result.current?.onSearchChange({ query: null });
    });
    expect(result.current?.matchCount).toBe(3);
    // The last valid query stays in the box.
    expect(result.current?.searchQuery).toBe(query);
    expect(onQueryChange).toHaveBeenLastCalledWith(null);
  });

  it('resets the query without persisting it', () => {
    const { result, onQueryChange } = renderUseInMemoryTableQuery('status=disabled');

    act(() => result.current?.resetQuery());

    expect(result.current?.matchCount).toBe(3);
    expect(result.current?.searchQuery.text).toBe('');
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('marks no status as active after a parse error, as the table then filters nothing', () => {
    const { result } = renderUseInMemoryTableQuery('status=disabled');

    act(() => {
      result.current?.onSearchChange({ query: null });
    });

    expect(result.current?.activeStatus).toBeUndefined();
  });

  it('goes back to the first page on a status, a search, a reset or new items', () => {
    let currentItems = items;
    const result: { current: HookResult | undefined } = { current: undefined };
    const Harness = () => {
      result.current = useInMemoryTableQuery('', currentItems, jest.fn());
      return null;
    };
    const { rerender } = render(<Harness />);
    const goToPage = (index: number) =>
      act(() => result.current?.onTableChange({ page: { index } }));

    goToPage(2);
    expect(result.current?.pageIndex).toBe(2);

    act(() => result.current?.toggleStatus('disabled'));
    expect(result.current?.pageIndex).toBe(0);

    goToPage(1);
    act(() => {
      result.current?.onSearchChange({ query: EuiSearchBar.Query.parse('aws') });
    });
    expect(result.current?.pageIndex).toBe(0);

    goToPage(1);
    act(() => result.current?.resetQuery());
    expect(result.current?.pageIndex).toBe(0);

    goToPage(1);
    currentItems = [...items];
    rerender(<Harness />);
    expect(result.current?.pageIndex).toBe(0);
  });

  it('keeps the page on a table change without page info, e.g. a sort', () => {
    const { result } = renderUseInMemoryTableQuery('');

    act(() => result.current?.onTableChange({ page: { index: 3 } }));
    act(() => result.current?.onTableChange({}));

    expect(result.current?.pageIndex).toBe(3);
  });
});
