/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Integration } from './Integration';
import {
  CHANGES_APPLY_DELAY_NOTICE,
  CHANGES_APPLY_DELAY_TOAST_LIFE_TIME_MS,
  IntegrationMode,
} from '../utils/constants';

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    integrations: { updateIntegration: jest.fn() },
  },
}));

const { DataStore } = jest.requireMock('../../../store/DataStore');

// Wazuh: the global `useContext` mock in test/setup.jest.ts breaks react-router's
// hooks under <MemoryRouter> (see Rules.test.tsx), so the route is stubbed instead.
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ integrationId: 'wazuh-core' }),
  useLocation: () => ({ pathname: '/integrations/wazuh-core', search: '?space=draft' }),
}));

const mockUseIntegrationDetails = jest.fn();
jest.mock('../hooks/useIntegrationDetails', () => ({
  useIntegrationDetails: (...args: unknown[]) => mockUseIntegrationDetails(...args),
}));

jest.mock('../../../utils/helpers', () => ({
  ...jest.requireActual('../../../utils/helpers'),
  setBreadcrumbs: jest.fn(),
}));

// The legacy header renders its children in place, which keeps the Actions menu in the tree.
jest.mock('../../../components/PageHeader/PageHeader', () => ({
  PageHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/IntegrationDetails', () => ({
  IntegrationDetails: () => null,
}));

const buildIntegration = (enabled: boolean) => ({
  id: 'os-id',
  document: {
    id: 'wazuh-core',
    enabled,
    mode: IntegrationMode.UserManaged,
    metadata: { title: 'Wazuh core' },
    rules: [],
    decoders: [],
    kvdbs: [],
  },
  space: { name: 'draft' },
  detectionRulesCount: 0,
  decodersCount: 0,
  kvdbsCount: 0,
});

const renderIntegration = async (enabled: boolean, notifications: any) => {
  mockUseIntegrationDetails.mockReturnValue({
    integration: buildIntegration(enabled),
    reloadTrigger: 0,
    loading: false,
    notFound: false,
    refresh: jest.fn(),
    setIntegration: jest.fn(),
  });

  await act(async () => {
    render(
      <Integration
        {...({ history: { push: jest.fn(), replace: jest.fn() } } as any)}
        notifications={notifications}
      />
    );
  });
};

const toggleEnabledFromActionsMenu = async () => {
  fireEvent.click(screen.getByTestId('integrationsActionsButton'));
  await act(async () => {
    fireEvent.click(screen.getByTestId('integrationEnableDisableMenuItem'));
  });
};

describe('<Integration /> enable/disable toast', () => {
  beforeEach(() => {
    DataStore.integrations.updateIntegration.mockReset();
  });

  it('tells the user that the changes can take a few minutes to apply once enabling succeeds', async () => {
    DataStore.integrations.updateIntegration.mockResolvedValue(true);
    const notifications = { toasts: { addSuccess: jest.fn() } };
    await renderIntegration(false, notifications);

    await toggleEnabledFromActionsMenu();

    expect(DataStore.integrations.updateIntegration).toHaveBeenCalledWith(
      'os-id',
      expect.objectContaining({ document: expect.objectContaining({ enabled: true }) })
    );
    expect(notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'Successfully updated integration Wazuh core',
      text: CHANGES_APPLY_DELAY_NOTICE,
      toastLifeTimeMs: CHANGES_APPLY_DELAY_TOAST_LIFE_TIME_MS,
    });
  });

  it('shows no success toast when enabling fails', async () => {
    DataStore.integrations.updateIntegration.mockResolvedValue(false);
    const notifications = { toasts: { addSuccess: jest.fn() } };
    await renderIntegration(false, notifications);

    await toggleEnabledFromActionsMenu();

    expect(DataStore.integrations.updateIntegration).toHaveBeenCalled();
    expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('keeps the default toast without the notice once disabling succeeds', async () => {
    DataStore.integrations.updateIntegration.mockResolvedValue(true);
    const notifications = { toasts: { addSuccess: jest.fn() } };
    await renderIntegration(true, notifications);

    await toggleEnabledFromActionsMenu();

    expect(DataStore.integrations.updateIntegration).toHaveBeenCalledWith(
      'os-id',
      expect.objectContaining({ document: expect.objectContaining({ enabled: false }) })
    );
    expect(notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'Successfully updated integration Wazuh core',
      text: '',
      toastLifeTimeMs: 5000,
    });
  });
});
