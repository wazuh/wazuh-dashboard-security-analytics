/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { IntegrationCell } from './IntegrationCell';
import { ROUTES } from '../../utils/constants';
import { DataStore } from '../../store/DataStore';

jest.mock('../../store/DataStore', () => ({
  DataStore: {
    integrations: {
      getIntegration: jest.fn(),
    },
  },
}));

// Wazuh: fake `history.push` via the `history` override — see useUrlFilterParams.ts
// for why useHistory() itself is unusable under this suite's global mocks.
const renderWithFakeHistory = (name: string) => {
  const push = jest.fn();
  render(<IntegrationCell name={name} history={{ push }} />);
  return {
    getPushedPath: () => push.mock.calls[0]?.[0],
  };
};

describe('IntegrationCell', () => {
  it('renders plain text with no popover when name is empty', () => {
    render(<IntegrationCell name="" />);
    expect(screen.queryByTestId('integrationCellLink')).not.toBeInTheDocument();
  });

  it('navigates to decoders with the integration name pre-filled', () => {
    const { getPushedPath } = renderWithFakeHistory('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    fireEvent.click(screen.getByText('Go to integration decoders'));
    expect(getPushedPath()).toBe(`${ROUTES.DECODERS}?integration=aws`);
  });

  it('navigates to rules with the integration name pre-filled', () => {
    const { getPushedPath } = renderWithFakeHistory('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    fireEvent.click(screen.getByText('Go to integration rules'));
    expect(getPushedPath()).toBe(`${ROUTES.RULES}?integration=aws`);
  });

  it('navigates to KVDBs with the integration name pre-filled', () => {
    const { getPushedPath } = renderWithFakeHistory('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    fireEvent.click(screen.getByText('Go to integration KVDBs'));
    expect(getPushedPath()).toBe(`${ROUTES.KVDBS}?integration=aws`);
  });

  it('does not check related items when integrationId/space are omitted', () => {
    renderWithFakeHistory('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(DataStore.integrations.getIntegration).not.toHaveBeenCalled();
  });

  it('disables a CTA and explains why when the integration has no items of that type', async () => {
    (DataStore.integrations.getIntegration as jest.Mock).mockResolvedValue({
      id: 'int-1',
      document: { rules: ['r1'], kvdbs: ['k1'] },
    });
    const push = jest.fn();
    render(
      <IntegrationCell name="aws" history={{ push }} integrationId="int-1" space="standard" />
    );

    fireEvent.click(screen.getByTestId('integrationCellLink'));
    await waitFor(() =>
      expect(DataStore.integrations.getIntegration).toHaveBeenCalledWith('int-1', 'standard')
    );

    expect(screen.getByText('Go to integration decoders').closest('button')).toBeDisabled();
    fireEvent.click(screen.getByText('Go to integration decoders'));
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Go to integration rules'));
    expect(push).toHaveBeenCalledWith(`${ROUTES.RULES}?integration=aws`);
  });
});
