/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { DataStore } from '../../../store/DataStore';
import { DecoderDetailsFlyout } from './DecoderDetailsFlyout';

const decoder: any = {
  id: 'dec-1',
  space: 'standard',
  integrations: ['cisco'],
  document: {
    id: 'dec-1',
    name: 'decoder/cisco-nexus/0',
    enabled: true,
    metadata: {
      title: 'Cisco Nexus',
      description: 'Parses Cisco Nexus logs.',
      author: 'Wazuh',
      date: '2025-09-30',
      documentation: '',
      supports: [],
      references: ['https://example.com/cisco'],
    },
  },
};

describe('<DecoderDetailsFlyout />', () => {
  it('uses the shared details layout', async () => {
    jest.spyOn(DataStore.decoders, 'getDecoder').mockResolvedValue(decoder);
    render(<DecoderDetailsFlyout decoderId="dec-1" space="standard" onClose={jest.fn()} />);

    const overview = within(await screen.findByTestId('decoder_flyout_overview'));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Cisco Nexus');
    expect(screen.getByText('Decoder details')).toBeTruthy();
    expect(screen.getByTestId('decoder_flyout_enabled').textContent).toContain('Enabled');
    expect(screen.getByTestId('decoder_flyout_space').textContent).toBe('Space: standard');
    expect(screen.getByTestId('decoder_flyout_description').textContent).toBe(
      'Parses Cisco Nexus logs.'
    );
    expect(overview.getByText('decoder/cisco-nexus/0')).toBeTruthy();
    expect(overview.getByText('cisco')).toBeTruthy();
    expect(overview.getByText('Sep 30, 2025')).toBeTruthy();
    expect(overview.queryByText('Title')).toBeNull();
    expect(overview.queryByText('Documentation')).toBeNull();
    expect(
      screen.getByTestId('decoder_flyout_section_references').querySelector('h3')?.textContent
    ).toBe('References (1)');
    expect(screen.getByTestId('decoder-details-view-selector')).toBeTruthy();
  });
});
