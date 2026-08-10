/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EntityFilterBar } from './EntityFilterBar';

jest.mock('../IntegrationComboBox/useIntegrationSelector', () => ({
  useIntegrationSelector: () => ({ loading: false, options: [], refresh: jest.fn() }),
}));

describe('EntityFilterBar', () => {
  it('renders the Status dropdown', () => {
    render(<EntityFilterBar status="" onStatusChange={jest.fn()} />);
    expect(screen.getByTestId('entityFilterBarStatus')).toBeInTheDocument();
  });

  it('does not render the Integration dropdown when the integration prop is omitted', () => {
    render(<EntityFilterBar status="" onStatusChange={jest.fn()} />);
    expect(screen.queryByTestId('entityFilterBarIntegration')).not.toBeInTheDocument();
  });

  it('renders the Integration dropdown when the integration prop is provided', () => {
    render(
      <EntityFilterBar
        status=""
        onStatusChange={jest.fn()}
        integration={{ selectedName: '', onChange: jest.fn() }}
      />
    );
    expect(screen.getByTestId('entityFilterBarIntegration')).toBeInTheDocument();
  });

  // Wazuh: design A6 — stale `?integration=<name>` (renamed/deleted integration)
  // must still show verbatim as the selected value instead of silently blanking
  // out, with no crash and no param loss.
  it('shows a stale integration name verbatim as the selected value when it matches no real option', () => {
    render(
      <EntityFilterBar
        status=""
        onStatusChange={jest.fn()}
        integration={{ selectedName: 'renamed-integration', onChange: jest.fn() }}
      />
    );

    expect(screen.getByTestId('entityFilterBarIntegration')).toBeInTheDocument();
    expect(screen.getByText('renamed-integration')).toBeInTheDocument();
  });

  it('does not crash and keeps the dropdown enabled when the stale name is the only option available', () => {
    render(
      <EntityFilterBar
        status=""
        onStatusChange={jest.fn()}
        integration={{ selectedName: 'ghost-integration', onChange: jest.fn() }}
      />
    );

    // Wazuh: with zero real options, IntegrationComboBox would normally show its
    // "No integrations available" callout and disable the combo box — but a stale
    // selection must still render its verbatim value, not that empty-state UI.
    expect(screen.queryByText('No integrations available')).not.toBeInTheDocument();
    expect(screen.getByText('ghost-integration')).toBeInTheDocument();
  });
});
