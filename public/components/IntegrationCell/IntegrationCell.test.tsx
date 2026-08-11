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
    push,
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

  it("carries this row's space along so the target table lands there too", () => {
    const push = jest.fn();
    render(<IntegrationCell name="aws" history={{ push }} space="custom" />);
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    fireEvent.click(screen.getByText('Go to integration rules'));
    expect(push).toHaveBeenCalledWith(`${ROUTES.RULES}?integration=aws&space=custom`);
  });

  it('does not check related items when integrationId/space are omitted', () => {
    renderWithFakeHistory('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(DataStore.integrations.getIntegration).not.toHaveBeenCalled();
  });

  it('shows the item count in the label and disables the CTA with a tooltip when the count is zero', async () => {
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

    // Zero count: shown, not hidden, disabled, with count in the label.
    expect(screen.getByText('Go to integration decoders (0)').closest('button')).toBeDisabled();
    fireEvent.click(screen.getByText('Go to integration decoders (0)'));
    expect(push).not.toHaveBeenCalled();

    // Non-zero counts: shown, enabled, with count in the label.
    expect(screen.getByText('Go to integration rules (1)').closest('button')).not.toBeDisabled();
    fireEvent.click(screen.getByText('Go to integration rules (1)'));
    expect(push).toHaveBeenCalledWith(`${ROUTES.RULES}?integration=aws&space=standard`);

    expect(screen.getByText('Go to integration KVDBs (1)').closest('button')).not.toBeDisabled();
  });

  it('keeps every CTA disabled and count-less while the check is still pending, on a slow connection', async () => {
    let resolveCheck: (value: any) => void = () => {};
    (DataStore.integrations.getIntegration as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveCheck = resolve;
      })
    );
    const push = jest.fn();
    render(
      <IntegrationCell name="aws" history={{ push }} integrationId="int-1" space="standard" />
    );

    fireEvent.click(screen.getByTestId('integrationCellLink'));

    expect(screen.getByText('Go to integration decoders').closest('button')).toBeDisabled();
    expect(screen.getByText('Go to integration rules').closest('button')).toBeDisabled();
    expect(screen.getByText('Go to integration KVDBs').closest('button')).toBeDisabled();
    fireEvent.click(screen.getByText('Go to integration rules'));
    expect(push).not.toHaveBeenCalled();

    resolveCheck({ id: 'int-1', document: { rules: ['r1'] } });
    await waitFor(() =>
      expect(screen.getByText('Go to integration rules (1)').closest('button')).not.toBeDisabled()
    );
  });

  it('omits the current-entity item when currentEntity is given, but keeps the others (incl. zero counts)', async () => {
    (DataStore.integrations.getIntegration as jest.Mock).mockResolvedValue({
      id: 'int-1',
      document: { rules: ['r1'] },
    });
    const push = jest.fn();
    render(
      <IntegrationCell
        name="aws"
        history={{ push }}
        integrationId="int-1"
        space="standard"
        currentEntity="rules"
      />
    );

    fireEvent.click(screen.getByTestId('integrationCellLink'));
    await waitFor(() =>
      expect(DataStore.integrations.getIntegration).toHaveBeenCalledWith('int-1', 'standard')
    );

    expect(screen.queryByText(/Go to integration rules/)).not.toBeInTheDocument();
    expect(screen.getByText('Go to integration decoders (0)')).toBeInTheDocument();
    expect(screen.getByText('Go to integration KVDBs (0)')).toBeInTheDocument();
  });

  it('renders all three entity items when currentEntity is omitted (e.g. Detectors)', () => {
    renderWithFakeHistory('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(screen.getByText('Go to integration decoders')).toBeInTheDocument();
    expect(screen.getByText('Go to integration rules')).toBeInTheDocument();
    expect(screen.getByText('Go to integration KVDBs')).toBeInTheDocument();
  });

  it('renders "Go to integration details" as the first item and navigates to the integration details URL', () => {
    const push = jest.fn();
    render(
      <IntegrationCell name="aws" history={{ push }} integrationId="int-1" space="standard" />
    );
    fireEvent.click(screen.getByTestId('integrationCellLink'));

    const detailsItem = screen.getByText('Go to integration details');
    expect(detailsItem).toBeInTheDocument();
    fireEvent.click(detailsItem);
    expect(push).toHaveBeenCalledWith(`${ROUTES.INTEGRATIONS}/int-1?space=standard`);
  });

  it('omits "Go to integration details" when integrationId or space is missing', () => {
    renderWithFakeHistory('aws');
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(screen.queryByText('Go to integration details')).not.toBeInTheDocument();
  });
});
