/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { PoliciesService } from './PoliciesService';
import { CLIENT_POLICY_METHODS, CONTENT_INDICES } from '../utils/constants';

const buildResponseFactory = () => ({
  custom: jest.fn((opts: any) => opts),
});

const buildClient = (callAsCurrentUser: jest.Mock) => {
  const osDriver: any = { asScoped: () => ({ callAsCurrentUser }) };
  return osDriver;
};

const makeRequest = (params: any) => ({ params, query: {} } as any);

const searchHits = (hits: Array<{ id: string; name?: string; title?: string }>) => ({
  hits: {
    hits: hits.map(({ id, name, title }) => ({
      _source: { document: { id, name, metadata: { title } } },
    })),
  },
});

describe('PoliciesService.getPolicyResources', () => {
  it('lists the normalization resources with their names, and falls back to the id', async () => {
    const callAsCurrentUser = jest.fn((method: string, params: any) => {
      if (method === CLIENT_POLICY_METHODS.GET_POLICY_RESOURCES) {
        return Promise.resolve({
          normalization: { decoders: ['dec-1'], kvdbs: ['kvdb-1', 'kvdb-2'], filters: [] },
          detection: { rules: ['rule-1'] },
          status: 200,
        });
      }
      if (params.index === CONTENT_INDICES.DECODERS) {
        return Promise.resolve(searchHits([{ id: 'dec-1', name: 'decoder/syslog/0' }]));
      }
      if (params.index === CONTENT_INDICES.KVDBS) {
        return Promise.resolve(searchHits([{ id: 'kvdb-1', title: 'Ports' }]));
      }
      return Promise.resolve(searchHits([]));
    });
    const service = new PoliciesService(buildClient(callAsCurrentUser), false);

    const result: any = await service.getPolicyResources(
      {} as any,
      makeRequest({ space: 'draft' }),
      buildResponseFactory() as any
    );

    expect(callAsCurrentUser).toHaveBeenCalledWith(CLIENT_POLICY_METHODS.GET_POLICY_RESOURCES, {
      space: 'draft',
    });
    // Filters are empty, so they are not searched.
    expect(callAsCurrentUser).not.toHaveBeenCalledWith(
      'search',
      expect.objectContaining({ index: CONTENT_INDICES.FILTERS })
    );
    expect(result.body).toEqual({
      ok: true,
      response: {
        normalization: {
          decoders: [{ id: 'dec-1', name: 'decoder/syslog/0' }],
          kvdbs: [
            { id: 'kvdb-1', name: 'Ports' },
            { id: 'kvdb-2', name: undefined },
          ],
          filters: [],
        },
        detection: { rules: ['rule-1'] },
      },
    });
  });

  it('reports the indexer error', async () => {
    const callAsCurrentUser = jest.fn(() => {
      const error: any = new Error('Unknown space: [bogus].');
      error.statusCode = 400;
      return Promise.reject(error);
    });
    const service = new PoliciesService(buildClient(callAsCurrentUser), false);

    const result: any = await service.getPolicyResources(
      {} as any,
      makeRequest({ space: 'bogus' }),
      buildResponseFactory() as any
    );

    expect(result.body).toEqual({ ok: false, error: 'Unknown space: [bogus].' });
  });
});

describe('PoliciesService.clearSpaceNormalization', () => {
  it('clears the normalization resources of the space', async () => {
    const callAsCurrentUser = jest.fn().mockResolvedValue({ status: 200 });
    const service = new PoliciesService(buildClient(callAsCurrentUser), false);

    const result: any = await service.clearSpaceNormalization(
      {} as any,
      makeRequest({ space: 'draft' }),
      buildResponseFactory() as any
    );

    expect(callAsCurrentUser).toHaveBeenCalledWith(
      CLIENT_POLICY_METHODS.CLEAR_SPACE_NORMALIZATION,
      { space: 'draft' }
    );
    expect(result.body).toEqual({ ok: true, response: null });
  });

  it('reports the indexer error', async () => {
    const callAsCurrentUser = jest.fn(() =>
      Promise.reject(new Error('Space [test] is not draft.'))
    );
    const service = new PoliciesService(buildClient(callAsCurrentUser), false);

    const result: any = await service.clearSpaceNormalization(
      {} as any,
      makeRequest({ space: 'test' }),
      buildResponseFactory() as any
    );

    expect(result.body).toEqual({ ok: false, error: 'Space [test] is not draft.' });
  });
});
