/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from '@jest/globals';
import { IntegrationStore } from './IntegrationStore';
import notificationsStartMock from '../../test/mocks/services/notifications/NotificationsStart.mock';
import { PromoteSpaces } from '../../types';

const emptyChanges = {
  policy: [],
  integrations: [],
  decoders: [],
  kvdbs: [],
  filters: [],
  rules: [],
};

const makeStore = (getPromoteIntegration: jest.Mock) => {
  const service = { getPromoteIntegration } as any;
  return new IntegrationStore(service, notificationsStartMock);
};

const okResponse = (changes: Record<string, unknown[]>) => ({
  ok: true,
  response: {
    promote: { space: 'draft', changes },
    available_promotions: {},
  },
});

describe('IntegrationStore.hasPromotableContentChanges', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls the promote diff endpoint with the given space', async () => {
    const getPromoteIntegration = jest.fn().mockResolvedValue(okResponse(emptyChanges));
    const store = makeStore(getPromoteIntegration);

    await store.hasPromotableContentChanges('draft' as PromoteSpaces);

    expect(getPromoteIntegration).toHaveBeenCalledWith({ space: 'draft' });
  });

  it('returns true when at least one content group has changes', async () => {
    const getPromoteIntegration = jest
      .fn()
      .mockResolvedValue(
        okResponse({ ...emptyChanges, integrations: [{ id: 'i_1', operation: 'delete' }] })
      );
    const store = makeStore(getPromoteIntegration);

    await expect(store.hasPromotableContentChanges('draft' as PromoteSpaces)).resolves.toBe(true);
  });

  it('returns false when only the policy group has changes (engine reports a timestamps-only policy update after every space reset)', async () => {
    const getPromoteIntegration = jest
      .fn()
      .mockResolvedValue(
        okResponse({ ...emptyChanges, policy: [{ id: 'p_1', operation: 'update' }] })
      );
    const store = makeStore(getPromoteIntegration);

    await expect(store.hasPromotableContentChanges('draft' as PromoteSpaces)).resolves.toBe(false);
  });

  it('returns true when policy AND a content group have changes', async () => {
    const getPromoteIntegration = jest.fn().mockResolvedValue(
      okResponse({
        ...emptyChanges,
        policy: [{ id: 'p_1', operation: 'update' }],
        rules: [{ id: 'r_1', operation: 'add' }],
      })
    );
    const store = makeStore(getPromoteIntegration);

    await expect(store.hasPromotableContentChanges('draft' as PromoteSpaces)).resolves.toBe(true);
  });

  it('returns false when every entity group is empty', async () => {
    const getPromoteIntegration = jest.fn().mockResolvedValue(okResponse(emptyChanges));
    const store = makeStore(getPromoteIntegration);

    await expect(store.hasPromotableContentChanges('draft' as PromoteSpaces)).resolves.toBe(false);
  });

  it('returns false and shows no error toast when the request is not ok', async () => {
    const getPromoteIntegration = jest.fn().mockResolvedValue({ ok: false, error: 'boom' });
    const store = makeStore(getPromoteIntegration);

    await expect(store.hasPromotableContentChanges('draft' as PromoteSpaces)).resolves.toBe(false);
    expect(notificationsStartMock.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('returns false and shows no error toast when the service throws', async () => {
    const getPromoteIntegration = jest.fn().mockRejectedValue(new Error('network down'));
    const store = makeStore(getPromoteIntegration);

    await expect(store.hasPromotableContentChanges('draft' as PromoteSpaces)).resolves.toBe(false);
    expect(notificationsStartMock.toasts.addDanger).not.toHaveBeenCalled();
  });
});
