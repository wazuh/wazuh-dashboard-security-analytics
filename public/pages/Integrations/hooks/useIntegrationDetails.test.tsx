/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { useIntegrationDetails, UseIntegrationDetailsResult } from './useIntegrationDetails';

jest.mock('../../../store/DataStore', () => ({
  DataStore: {
    integrations: { getIntegration: jest.fn() },
  },
}));

const { DataStore } = jest.requireMock('../../../store/DataStore');

const mockErrorNotificationToast = jest.fn();
jest.mock('../../../utils/helpers', () => ({
  ...jest.requireActual('../../../utils/helpers'),
  errorNotificationToast: (...args: unknown[]) => mockErrorNotificationToast(...args),
}));

const buildIntegration = (decoders: string[]) => ({
  id: 'os-id',
  document: { id: 'wazuh-core', metadata: { title: 'Wazuh core' }, decoders },
  space: { name: 'draft' },
});

// This repo has no @testing-library/react-hooks, so the hook is driven through
// a probe component that publishes its latest result (see useUrlFilterParams.test.tsx).
const setup = async () => {
  let latest: UseIntegrationDetailsResult;
  const Probe: React.FC = () => {
    latest = useIntegrationDetails('wazuh-core', 'draft');
    return null;
  };

  await act(async () => {
    render(<Probe />);
  });

  return () => latest;
};

describe('useIntegrationDetails', () => {
  beforeEach(() => {
    DataStore.integrations.getIntegration.mockReset();
    mockErrorNotificationToast.mockReset();
  });

  it('loads the integration, derives its counts and stamps a reload trigger', async () => {
    DataStore.integrations.getIntegration.mockResolvedValue(buildIntegration(['d-1']));

    const getResult = await setup();

    expect(DataStore.integrations.getIntegration).toHaveBeenCalledWith('wazuh-core', 'draft');
    expect(getResult().integration?.decodersCount).toBe(1);
    expect(getResult().integration?.detectionRulesCount).toBe(0);
    expect(getResult().notFound).toBe(false);
    expect(getResult().loading).toBe(false);
    expect(getResult().reloadTrigger).toBe(1);
  });

  it('re-reads the integration on refresh and bumps the reload trigger', async () => {
    DataStore.integrations.getIntegration.mockResolvedValue(buildIntegration(['d-1']));
    const getResult = await setup();

    // A decoder was created against this integration after the page loaded.
    DataStore.integrations.getIntegration.mockResolvedValue(buildIntegration(['d-1', 'd-2']));
    await act(async () => {
      await getResult().refresh();
    });

    expect(getResult().integration?.document.decoders).toEqual(['d-1', 'd-2']);
    expect(getResult().integration?.decodersCount).toBe(2);
    expect(getResult().reloadTrigger).toBe(2);
  });

  it('reports a missing integration on the first load', async () => {
    DataStore.integrations.getIntegration.mockResolvedValue(undefined);

    const getResult = await setup();

    expect(getResult().notFound).toBe(true);
    expect(getResult().integration).toBeUndefined();
    expect(mockErrorNotificationToast).not.toHaveBeenCalled();
  });

  it('keeps the loaded integration when a refresh comes back empty, and reports it', async () => {
    DataStore.integrations.getIntegration.mockResolvedValue(buildIntegration(['d-1']));
    const getResult = await setup();
    const reloadTriggerBefore = getResult().reloadTrigger;

    DataStore.integrations.getIntegration.mockResolvedValue(undefined);
    await act(async () => {
      await getResult().refresh();
    });

    // A failed reload must never blank a working page.
    expect(getResult().integration?.decodersCount).toBe(1);
    expect(getResult().notFound).toBe(false);
    expect(getResult().reloadTrigger).toBe(reloadTriggerBefore);
    expect(mockErrorNotificationToast).toHaveBeenCalled();
  });

  it('bumps the reload trigger when the document is replaced locally', async () => {
    DataStore.integrations.getIntegration.mockResolvedValue(buildIntegration(['d-1']));
    const getResult = await setup();

    const next = { ...getResult().integration!, decodersCount: 9 };
    act(() => {
      getResult().setIntegration(next);
    });

    expect(getResult().integration?.decodersCount).toBe(9);
    expect(getResult().reloadTrigger).toBe(2);
  });
});
