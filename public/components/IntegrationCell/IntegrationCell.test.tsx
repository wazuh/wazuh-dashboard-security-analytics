/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { IntegrationCell } from './IntegrationCell';
import { ROUTES } from '../../utils/constants';
import { DataStore } from '../../store/DataStore';
import { setupCoreStart } from '../../../test/utils/helpers';
import { getApplication } from '../../services/utils/constants';

beforeAll(() => {
  setupCoreStart();
  (getApplication().getUrlForApp as jest.Mock).mockImplementation(
    (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
  );
});

jest.mock('../../store/DataStore', () => ({
  DataStore: {
    integrations: {
      getIntegration: jest.fn(),
    },
    detectors: {
      countByIntegration: jest.fn(),
    },
  },
}));

describe('IntegrationCell', () => {
  beforeEach(() => {
    (DataStore.detectors.countByIntegration as jest.Mock).mockResolvedValue(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders plain text with no popover when name is empty', () => {
    render(<IntegrationCell name="" />);
    expect(screen.queryByTestId('integrationCellLink')).not.toBeInTheDocument();
  });

  it('links to decoders with the integration name pre-filled, as a real href (not history.push)', () => {
    render(<IntegrationCell name="aws" />);
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(screen.getByText('Go to integration decoders').closest('a')).toHaveAttribute(
      'href',
      `/app/decoders#${ROUTES.DECODERS}?integration=aws`
    );
  });

  it('links to rules with the integration name pre-filled', () => {
    render(<IntegrationCell name="aws" />);
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(screen.getByText('Go to integration rules').closest('a')).toHaveAttribute(
      'href',
      `/app/rules#${ROUTES.RULES}?integration=aws`
    );
  });

  it('links to KVDBs with the integration name pre-filled', () => {
    render(<IntegrationCell name="aws" />);
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(screen.getByText('Go to integration KVDBs').closest('a')).toHaveAttribute(
      'href',
      `/app/kvdbs#${ROUTES.KVDBS}?integration=aws`
    );
  });

  it("carries this row's space along so the target table lands there too", () => {
    render(<IntegrationCell name="aws" space="custom" />);
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(screen.getByText('Go to integration rules').closest('a')).toHaveAttribute(
      'href',
      `/app/rules#${ROUTES.RULES}?integration=aws&space=custom`
    );
  });

  it('does not check related items when integrationId/space are omitted', () => {
    render(<IntegrationCell name="aws" />);
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(DataStore.integrations.getIntegration).not.toHaveBeenCalled();
    expect(DataStore.detectors.countByIntegration).not.toHaveBeenCalled();
  });

  it('shows the item count in the label and disables the CTA with a tooltip when the count is zero', async () => {
    (DataStore.integrations.getIntegration as jest.Mock).mockResolvedValue({
      id: 'int-1',
      document: { rules: ['r1'], kvdbs: ['k1'] },
    });
    (DataStore.detectors.countByIntegration as jest.Mock).mockResolvedValue(2);
    render(<IntegrationCell name="aws" integrationId="int-1" space="standard" />);

    fireEvent.click(screen.getByTestId('integrationCellLink'));
    await waitFor(() =>
      expect(DataStore.integrations.getIntegration).toHaveBeenCalledWith('int-1', 'standard')
    );
    expect(DataStore.detectors.countByIntegration).toHaveBeenCalledWith('aws', 'standard');

    expect(screen.getByText('Go to integration decoders (0)').closest('button')).toBeDisabled();

    expect(screen.getByText('Go to integration rules (1)').closest('a')).toHaveAttribute(
      'href',
      `/app/rules#${ROUTES.RULES}?integration=aws&space=standard`
    );

    expect(screen.getByText('Go to integration KVDBs (1)').closest('a')).not.toBeNull();

    expect(screen.getByText('Go to integration detectors (2)').closest('a')).not.toBeNull();
  });

  it('disables the Detectors item with a "has no detectors" tooltip when the count is zero', async () => {
    (DataStore.integrations.getIntegration as jest.Mock).mockResolvedValue({
      id: 'int-1',
      document: {},
    });
    (DataStore.detectors.countByIntegration as jest.Mock).mockResolvedValue(0);
    render(<IntegrationCell name="aws" integrationId="int-1" space="standard" />);

    fireEvent.click(screen.getByTestId('integrationCellLink'));
    await waitFor(() =>
      expect(screen.getByText('Go to integration detectors (0)').closest('button')).toBeDisabled()
    );
  });

  it('keeps every CTA disabled and count-less while the check is still pending, on a slow connection', async () => {
    let resolveCheck: (value: any) => void = () => {};
    (DataStore.integrations.getIntegration as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveCheck = resolve;
      })
    );
    render(<IntegrationCell name="aws" integrationId="int-1" space="standard" />);

    fireEvent.click(screen.getByTestId('integrationCellLink'));

    expect(screen.getByText('Go to integration decoders').closest('button')).toBeDisabled();
    expect(screen.getByText('Go to integration rules').closest('button')).toBeDisabled();
    expect(screen.getByText('Go to integration KVDBs').closest('button')).toBeDisabled();
    expect(screen.getByText('Go to integration detectors').closest('button')).toBeDisabled();

    resolveCheck({ id: 'int-1', document: { rules: ['r1'] } });
    await waitFor(() =>
      expect(screen.getByText('Go to integration rules (1)').closest('a')).not.toBeNull()
    );
  });

  it('omits the current-entity item when currentEntity is given, but keeps the others (incl. zero counts)', async () => {
    (DataStore.integrations.getIntegration as jest.Mock).mockResolvedValue({
      id: 'int-1',
      document: { rules: ['r1'] },
    });
    render(
      <IntegrationCell name="aws" integrationId="int-1" space="standard" currentEntity="rules" />
    );

    fireEvent.click(screen.getByTestId('integrationCellLink'));
    await waitFor(() =>
      expect(DataStore.integrations.getIntegration).toHaveBeenCalledWith('int-1', 'standard')
    );

    expect(screen.queryByText(/Go to integration rules/)).not.toBeInTheDocument();
    expect(screen.getByText('Go to integration decoders (0)')).toBeInTheDocument();
    expect(screen.getByText('Go to integration KVDBs (0)')).toBeInTheDocument();
    expect(screen.getByText('Go to integration detectors (0)')).toBeInTheDocument();
  });

  it('hides the Detectors item when currentEntity="detectors" (rendered on the Detectors page)', async () => {
    (DataStore.integrations.getIntegration as jest.Mock).mockResolvedValue({
      id: 'int-1',
      document: { rules: ['r1'] },
    });
    (DataStore.detectors.countByIntegration as jest.Mock).mockResolvedValue(3);
    render(
      <IntegrationCell
        name="aws"
        integrationId="int-1"
        space="standard"
        currentEntity="detectors"
      />
    );

    fireEvent.click(screen.getByTestId('integrationCellLink'));
    await waitFor(() =>
      expect(DataStore.integrations.getIntegration).toHaveBeenCalledWith('int-1', 'standard')
    );

    expect(screen.queryByText(/Go to integration detectors/)).not.toBeInTheDocument();
    expect(screen.getByText('Go to integration rules (1)')).toBeInTheDocument();
  });

  it('renders all four entity items when currentEntity is omitted', () => {
    render(<IntegrationCell name="aws" />);
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(screen.getByText('Go to integration decoders')).toBeInTheDocument();
    expect(screen.getByText('Go to integration rules')).toBeInTheDocument();
    expect(screen.getByText('Go to integration KVDBs')).toBeInTheDocument();
    expect(screen.getByText('Go to integration detectors')).toBeInTheDocument();
  });

  it('renders "Go to integration details" as the first item, linking to the integration details URL', () => {
    render(<IntegrationCell name="aws" integrationId="int-1" space="standard" />);
    fireEvent.click(screen.getByTestId('integrationCellLink'));

    const detailsItem = screen.getByText('Go to integration details');
    expect(detailsItem).toBeInTheDocument();
    expect(detailsItem.closest('a')).toHaveAttribute(
      'href',
      `/app/sa-integrations#${ROUTES.INTEGRATIONS}/int-1?space=standard`
    );
  });

  it('omits "Go to integration details" when integrationId or space is missing', () => {
    render(<IntegrationCell name="aws" />);
    fireEvent.click(screen.getByTestId('integrationCellLink'));
    expect(screen.queryByText('Go to integration details')).not.toBeInTheDocument();
  });
});
