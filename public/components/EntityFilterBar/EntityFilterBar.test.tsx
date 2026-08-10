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
});
