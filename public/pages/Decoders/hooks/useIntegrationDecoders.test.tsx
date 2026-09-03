/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { useIntegrationDecoders, UseIntegrationDecodersParams } from './useIntegrationDecoders';

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    decoders: { searchDecoders: jest.fn() },
  },
}));

const { DataStore } = jest.requireMock('../../../store/DataStore');

const BASE: UseIntegrationDecodersParams = {
  decoderIds: ['d-1'],
  space: 'draft',
  enabled: true,
  pageIndex: 0,
  pageSize: 10,
  sortField: 'name',
  sortDirection: 'asc',
  search: '',
  reloadTrigger: 0,
};

const Probe: React.FC<UseIntegrationDecodersParams> = (params) => {
  useIntegrationDecoders(params);
  return null;
};

const setup = async (params: Partial<UseIntegrationDecodersParams> = {}) => {
  const props = { ...BASE, ...params };
  let rerender: (next: Partial<UseIntegrationDecodersParams>) => Promise<void>;

  await act(async () => {
    const view = render(<Probe {...props} />);
    rerender = async (next) => {
      await act(async () => {
        view.rerender(<Probe {...props} {...next} />);
      });
    };
  });

  return { rerender: rerender! };
};

const searchCalls = () => DataStore.decoders.searchDecoders.mock.calls;

describe('useIntegrationDecoders', () => {
  beforeEach(() => {
    DataStore.decoders.searchDecoders.mockReset();
    DataStore.decoders.searchDecoders.mockResolvedValue({ items: [], total: 0 });
  });

  it('queries the decoders named by the integration', async () => {
    await setup();

    expect(searchCalls()).toHaveLength(1);
    expect(searchCalls()[0][0].query.bool.filter).toEqual([{ terms: { 'document.id': ['d-1'] } }]);
    expect(searchCalls()[0][1]).toBe('draft');
  });

  // Wazuh: the details page bumps `reloadTrigger` once per re-read integration
  // document. That stamp is what makes Refresh work when the id list is
  // unchanged — e.g. a decoder was edited rather than created (#478).
  it('re-queries when the refresh stamp changes with an unchanged id list', async () => {
    const { rerender } = await setup();
    expect(searchCalls()).toHaveLength(1);

    await rerender({ reloadTrigger: 1 });

    expect(searchCalls()).toHaveLength(2);
  });

  // The parent rebuilds the id array on every render, so identity alone would
  // re-query on unrelated state changes (e.g. enabling the integration).
  it('does not re-query when the parent passes a new array of the same ids', async () => {
    const { rerender } = await setup();
    expect(searchCalls()).toHaveLength(1);

    await rerender({ decoderIds: ['d-1'] });

    expect(searchCalls()).toHaveLength(1);
  });

  it('issues exactly one query when a refresh brings both a new id list and a new stamp', async () => {
    const { rerender } = await setup();
    expect(searchCalls()).toHaveLength(1);

    await rerender({ decoderIds: ['d-1', 'd-2'], reloadTrigger: 1 });

    expect(searchCalls()).toHaveLength(2);
    expect(searchCalls()[1][0].query.bool.filter).toEqual([
      { terms: { 'document.id': ['d-1', 'd-2'] } },
    ]);
  });

  it('does not query while the tab is not shown', async () => {
    await setup({ enabled: false });

    expect(searchCalls()).toHaveLength(0);
  });
});
