/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { PoliciesService } from './PoliciesService';
import { CLIENT_POLICY_METHODS } from '../utils/constants';

const buildResponseFactory = () => ({
  custom: jest.fn((opts: any) => opts),
});

describe('PoliciesService.updatePolicy — root_decoder normalization', () => {
  const buildService = () => {
    const callAsCurrentUser = jest.fn((method: string) => {
      if (method === CLIENT_POLICY_METHODS.UPDATE_POLICY) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({});
    });
    const osDriver: any = { asScoped: () => ({ callAsCurrentUser }) };
    const service = new PoliciesService(osDriver, false);
    return { service, callAsCurrentUser };
  };

  const makeRequest = (body: any) => ({ params: { space: 'standard' }, body } as any);

  it('sends an empty string to the engine when root_decoder is null', async () => {
    const { service, callAsCurrentUser } = buildService();
    const response = buildResponseFactory();

    await service.updatePolicy({} as any, makeRequest({ root_decoder: null }), response as any);

    const call = callAsCurrentUser.mock.calls.find(
      (c) => c[0] === CLIENT_POLICY_METHODS.UPDATE_POLICY
    );
    expect(call[1].body.resource.root_decoder).toBe('');
  });

  it('leaves a real root_decoder value untouched', async () => {
    const { service, callAsCurrentUser } = buildService();
    const response = buildResponseFactory();

    await service.updatePolicy(
      {} as any,
      makeRequest({ root_decoder: 'decoder/core/0' }),
      response as any
    );

    const call = callAsCurrentUser.mock.calls.find(
      (c) => c[0] === CLIENT_POLICY_METHODS.UPDATE_POLICY
    );
    expect(call[1].body.resource.root_decoder).toBe('decoder/core/0');
  });
});
