/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from '@jest/globals';
import { PoliciesStore } from './PoliciesStore';
import notificationsStartMock from '../../test/mocks/services/notifications/NotificationsStart.mock';

const makeStore = (updatePolicy: jest.Mock) => {
  const service = { updatePolicy } as any;
  return new PoliciesStore(service, notificationsStartMock);
};

describe('PoliciesStore.updatePolicy', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('surfaces a thrown HTTP error as a toast instead of rejecting silently', async () => {
    const httpError = { body: { message: 'expected value of type [string] but got [null]' } };
    const updatePolicy = jest.fn().mockRejectedValue(httpError);
    const store = makeStore(updatePolicy);

    await expect(store.updatePolicy('standard', {})).resolves.toEqual([false, null]);
    expect(notificationsStartMock.toasts.addDanger).toHaveBeenCalled();
  });

  it('returns [true, response] on success', async () => {
    const updatePolicy = jest.fn().mockResolvedValue({ ok: true, response: { updated: true } });
    const store = makeStore(updatePolicy);

    await expect(store.updatePolicy('standard', {})).resolves.toEqual([true, { updated: true }]);
    expect(notificationsStartMock.toasts.addDanger).not.toHaveBeenCalled();
  });
});

describe('PoliciesStore.clearSpaceNormalization', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns true on success', async () => {
    const service = { clearSpaceNormalization: jest.fn().mockResolvedValue({ ok: true }) } as any;
    const store = new PoliciesStore(service, notificationsStartMock);

    await expect(store.clearSpaceNormalization('draft')).resolves.toBe(true);
    expect(notificationsStartMock.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('shows a toast and returns false on failure', async () => {
    const service = {
      clearSpaceNormalization: jest.fn().mockResolvedValue({ ok: false, error: 'boom' }),
    } as any;
    const store = new PoliciesStore(service, notificationsStartMock);

    await expect(store.clearSpaceNormalization('draft')).resolves.toBe(false);
    expect(notificationsStartMock.toasts.addDanger).toHaveBeenCalled();
  });
});

describe('PoliciesStore.getPolicyResources', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the resources on success', async () => {
    const resources = {
      normalization: { decoders: [], kvdbs: [{ id: 'kvdb-1', name: 'Ports' }], filters: [] },
      detection: { rules: [] },
    };
    const service = {
      getPolicyResources: jest.fn().mockResolvedValue({ ok: true, response: resources }),
    } as any;
    const store = new PoliciesStore(service, notificationsStartMock);

    await expect(store.getPolicyResources('draft')).resolves.toEqual({ ok: true, resources });
  });

  it('returns the error without a toast, so the caller can show it', async () => {
    const service = {
      getPolicyResources: jest.fn().mockRejectedValue({ body: { message: 'Forbidden' } }),
    } as any;
    const store = new PoliciesStore(service, notificationsStartMock);

    await expect(store.getPolicyResources('draft')).resolves.toEqual({
      ok: false,
      error: 'Forbidden',
    });
    expect(notificationsStartMock.toasts.addDanger).not.toHaveBeenCalled();
  });
});
