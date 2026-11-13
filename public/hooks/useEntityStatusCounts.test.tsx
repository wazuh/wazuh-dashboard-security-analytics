/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { countEntityByStatus, useEntityStatusCounts } from './useEntityStatusCounts';

jest.mock('../store/DataStore', () => ({
  DataStore: {
    decoders: { searchDecoders: jest.fn() },
    rules: { searchRules: jest.fn() },
    kvdbs: { searchKVDBs: jest.fn() },
  },
}));

const { DataStore } = jest.requireMock('../store/DataStore');

beforeEach(() => {
  DataStore.decoders.searchDecoders.mockReset().mockResolvedValue({ total: 4, items: [] });
  DataStore.rules.searchRules.mockReset().mockResolvedValue({ total: 5, items: [] });
  DataStore.kvdbs.searchKVDBs.mockReset().mockResolvedValue({ total: 6, items: [] });
});

describe('countEntityByStatus', () => {
  it('counts decoders with a silent size-0 search in the space', async () => {
    await expect(countEntityByStatus('decoders', 'enabled', { space: 'standard' })).resolves.toBe(
      4
    );
    expect(DataStore.decoders.searchDecoders).toHaveBeenCalledWith(
      { from: 0, size: 0, query: { match_all: {} }, status: 'enabled', _source: false },
      'standard',
      { silent: true }
    );
  });

  it('counts rules, limited to the given documents', async () => {
    await expect(
      countEntityByStatus('rules', 'disabled', { space: 'draft', ids: ['r1', 'r2'] })
    ).resolves.toBe(5);
    expect(DataStore.rules.searchRules).toHaveBeenCalledWith(
      {
        query: { terms: { 'document.id': ['r1', 'r2'] } },
        from: 0,
        size: 0,
        status: 'disabled',
        _source: false,
      },
      'draft',
      { silent: true }
    );
  });

  it('counts KVDBs with the space and the documents as filter clauses', async () => {
    await expect(
      countEntityByStatus('kvdbs', 'enabled', { space: 'custom', ids: ['k1'] })
    ).resolves.toBe(6);
    expect(DataStore.kvdbs.searchKVDBs).toHaveBeenCalledWith(
      {
        size: 0,
        query: {
          bool: {
            filter: [{ terms: { 'document.id': ['k1'] } }, { term: { 'space.name': 'custom' } }],
          },
        },
        status: 'enabled',
        track_total_hits: true,
        _source: false,
      },
      { skipIntegrationMap: true, silent: true }
    );
  });

  it('matches every KVDB without a space or documents', async () => {
    await countEntityByStatus('kvdbs', 'enabled', { space: '' });

    expect(DataStore.kvdbs.searchKVDBs.mock.calls[0][0].query).toEqual({ match_all: {} });
  });

  it('throws on a failed search instead of counting 0', async () => {
    DataStore.decoders.searchDecoders.mockResolvedValue({ total: 0, items: [], error: 'boom' });

    await expect(countEntityByStatus('decoders', 'enabled', { space: 'standard' })).rejects.toThrow(
      'boom'
    );
  });
});

describe('useEntityStatusCounts', () => {
  type HookResult = ReturnType<typeof useEntityStatusCounts>;

  const renderHook = (ids: string[], enabled = true) => {
    const result: { current: HookResult | undefined } = { current: undefined };
    const Harness = (props: { ids: string[] }) => {
      result.current = useEntityStatusCounts(
        'decoders',
        { space: 'standard', ids: props.ids },
        { enabled }
      );
      return null;
    };
    const utils = render(<Harness ids={ids} />);
    return { result, rerender: (next: string[]) => utils.rerender(<Harness ids={next} />) };
  };

  const flush = () => act(() => Promise.resolve());

  it('returns the split, and drops it when one request fails', async () => {
    DataStore.decoders.searchDecoders.mockImplementation(async (params: any) =>
      params.status === 'enabled' ? { total: 9, items: [] } : { total: 0, items: [], error: 'boom' }
    );
    const { result } = renderHook(['d1']);
    await flush();

    // A partial split would read 100% enabled.
    expect(result.current?.counts).toBeUndefined();
    expect(result.current?.loading).toBe(false);
  });

  it('refetches when the documents change, not when only the array is rebuilt', async () => {
    const { result, rerender } = renderHook(['d1']);
    await flush();
    expect(result.current?.counts).toEqual({ enabled: 4, disabled: 4 });
    expect(DataStore.decoders.searchDecoders).toHaveBeenCalledTimes(2);

    rerender(['d1']);
    await flush();
    expect(DataStore.decoders.searchDecoders).toHaveBeenCalledTimes(2);

    rerender(['d1', 'd2']);
    await flush();
    expect(DataStore.decoders.searchDecoders).toHaveBeenCalledTimes(4);
  });

  it('does not fetch while disabled', async () => {
    const { result } = renderHook(['d1'], false);
    await flush();

    expect(DataStore.decoders.searchDecoders).not.toHaveBeenCalled();
    expect(result.current?.loading).toBe(false);
  });
});
