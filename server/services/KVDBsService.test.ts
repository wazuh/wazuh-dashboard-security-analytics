/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { KVDBsService } from './KVDBsService';

const buildResponseFactory = () => ({
  custom: jest.fn((opts: any) => opts),
});

describe('KVDBsService.fetchKVDBIdsByIntegrationName', () => {
  const buildService = (searchImpl: (params: any) => any) => {
    const callAsCurrentUser = jest.fn((method: string, params: any) => {
      if (method === 'search') {
        return Promise.resolve(searchImpl(params));
      }
      return Promise.resolve({});
    });
    const osDriver: any = { asScoped: () => ({ callAsCurrentUser }) };
    const service = new KVDBsService(osDriver, false);
    return { service, callAsCurrentUser };
  };

  it('returns an empty list when integrationNames is blank', async () => {
    const { service } = buildService(() => ({ hits: { hits: [] } }));
    const response = buildResponseFactory();

    await service.fetchKVDBIdsByIntegrationName(
      {} as any,
      { body: { integrationNames: ['  '] }, query: {} } as any,
      response as any
    );

    expect(response.custom).toHaveBeenCalledWith(
      expect.objectContaining({ body: { ok: true, response: { kvdbIds: [] } } })
    );
  });

  it('resolves kvdb ids via an exact terms match, scoped to the given space', async () => {
    const { service, callAsCurrentUser } = buildService((params) => ({
      hits: { hits: [{ _source: { document: { kvdbs: ['kvdb-1', 'kvdb-2'] } } }] },
    }));
    const response = buildResponseFactory();

    await service.fetchKVDBIdsByIntegrationName(
      {} as any,
      { body: { integrationNames: ['aws'], space: 'standard' }, query: {} } as any,
      response as any
    );

    const searchCall = callAsCurrentUser.mock.calls.find((call) => call[0] === 'search');
    expect(searchCall).toBeDefined();
    const body = JSON.parse(searchCall![1].body);
    expect(body.query.bool.must).toEqual([
      { terms: { 'document.metadata.title': ['aws'] } },
      { term: { 'space.name': 'standard' } },
    ]);
    expect(response.custom).toHaveBeenCalledWith(
      expect.objectContaining({ body: { ok: true, response: { kvdbIds: ['kvdb-1', 'kvdb-2'] } } })
    );
  });

  it('resolves multiple integrationNames (multiSelect or) in one terms clause', async () => {
    const { service, callAsCurrentUser } = buildService(() => ({
      hits: { hits: [{ _source: { document: { kvdbs: ['kvdb-1'] } } }] },
    }));
    const response = buildResponseFactory();

    await service.fetchKVDBIdsByIntegrationName(
      {} as any,
      { body: { integrationNames: ['aws', 'cisco'] }, query: {} } as any,
      response as any
    );

    const searchCall = callAsCurrentUser.mock.calls.find((call) => call[0] === 'search');
    const body = JSON.parse(searchCall![1].body);
    expect(body.query.bool.must).toEqual([
      { terms: { 'document.metadata.title': ['aws', 'cisco'] } },
    ]);
  });

  it('returns an empty list when no integration matches', async () => {
    const { service } = buildService(() => ({ hits: { hits: [] } }));
    const response = buildResponseFactory();

    await service.fetchKVDBIdsByIntegrationName(
      {} as any,
      { body: { integrationNames: ['unknown'] }, query: {} } as any,
      response as any
    );

    expect(response.custom).toHaveBeenCalledWith(
      expect.objectContaining({ body: { ok: true, response: { kvdbIds: [] } } })
    );
  });
});
