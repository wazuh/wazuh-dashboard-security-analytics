/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FiltersTab } from './FiltersTab';
import { DataStore } from '../../../store/DataStore';

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    filters: {
      searchFilters: jest.fn().mockResolvedValue({ items: [] }),
      deleteFilter: jest.fn(),
    },
  },
}));

const buildHistory = (search = '') => ({
  location: { search, pathname: '/filters' },
  replace: jest.fn(),
  push: jest.fn(),
});

describe('FiltersTab', () => {
  it('does not render an Integration column CTA/popover (no integration relation)', async () => {
    render(
      <FiltersTab
        spaceFilter="standard"
        notifications={{} as any}
        history={buildHistory() as any}
      />
    );

    await waitFor(() => expect(DataStore.filters.searchFilters).toHaveBeenCalled());

    expect(screen.queryByTestId('integrationCellLink')).not.toBeInTheDocument();
  });
});
