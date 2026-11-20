/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { DataStore } from '../../../store/DataStore';
import { KVDBDetailsFlyout } from './KVDBDetailsFlyout';

const kvdb: any = {
  id: 'kvdb-1',
  space: { name: 'draft' },
  integration: { title: 'windows' },
  document: {
    id: 'kvdb-1',
    enabled: false,
    content: { key: 'value' },
    metadata: {
      title: 'Windows event IDs',
      description: 'Maps event IDs to names.',
      author: 'Wazuh',
      modified: '2026-03-20',
      references: [],
    },
  },
};

describe('<KVDBDetailsFlyout />', () => {
  it('uses the shared details layout', async () => {
    jest.spyOn(DataStore.kvdbs, 'getKVDB').mockResolvedValue(kvdb);
    render(<KVDBDetailsFlyout kvdbId="kvdb-1" onClose={jest.fn()} />);

    const overview = within(await screen.findByTestId('kvdb_flyout_overview'));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Windows event IDs');
    expect(screen.getByTestId('kvdb_flyout_enabled').textContent).toContain('Disabled');
    expect(screen.getByTestId('kvdb_flyout_space').textContent).toBe('Space: draft');
    expect(overview.getByText('windows')).toBeTruthy();
    expect(overview.getByText('Mar 20, 2026')).toBeTruthy();
    expect(overview.queryByText('Created')).toBeNull();
    const content = screen.getByTestId('kvdb_flyout_section_content').querySelector('button')!;
    expect(content.getAttribute('aria-expanded')).toBe('true');
    expect(screen.queryByTestId('kvdb_flyout_section_references')).toBeNull();
  });
});
