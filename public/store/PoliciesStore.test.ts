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
