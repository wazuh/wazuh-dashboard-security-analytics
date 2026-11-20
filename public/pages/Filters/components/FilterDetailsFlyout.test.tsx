/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { DataStore } from '../../../store/DataStore';
import { FilterDetailsFlyout } from './FilterDetailsFlyout';

const SHA = 'a'.repeat(64);

const filter: any = {
  id: 'flt-1',
  space: { name: 'custom' },
  hash: { sha256: SHA },
  yaml: '',
  document: {
    id: 'flt-1',
    name: 'filter/drop-noise/0',
    type: 'post-filter',
    check: '$event.code == 1',
    enabled: true,
    metadata: { description: 'Drops noisy events.', author: { name: 'Wazuh' } },
  },
};

describe('<FilterDetailsFlyout />', () => {
  it('uses the shared details layout with the filter type, check and hash', async () => {
    jest.spyOn(DataStore.filters, 'getFilter').mockResolvedValue(filter);
    render(<FilterDetailsFlyout filterId="flt-1" onClose={jest.fn()} />);

    const overview = within(await screen.findByTestId('filter_flyout_overview'));
    // No title: the name is the heading.
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('filter/drop-noise/0');
    expect(screen.getByTestId('filter_flyout_type').textContent).toBe('Type: Post-filter');
    expect(screen.getByTestId('filter_flyout_space').textContent).toBe('Space: custom');
    expect(overview.getByText('Wazuh')).toBeTruthy();
    expect(overview.getByText(SHA)).toBeTruthy();
    expect(overview.getByLabelText('Copy SHA256')).toBeTruthy();
    const check = screen.getByTestId('filter_flyout_section_check').querySelector('button')!;
    expect(check.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('filter_flyout_check')).toBeTruthy();
    expect(screen.queryByTestId('filter_flyout_section_references')).toBeNull();
  });
});
