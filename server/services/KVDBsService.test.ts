/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { KVDBsService } from './KVDBsService';

const buildResponseFactory = () => ({
  custom: jest.fn((opts: any) => opts),
});

describe('KVDBsService.searchKVDBs — Integration filter', () => {
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

  it('resolves integrationNames to kvdb ids server-side and filters by document.id, in one client call chain', async () => {
    const { service, callAsCurrentUser } = buildService((params) => {
      if (params.index === 'wazuh-threatintel-integrations') {
        return { hits: { hits: [{ _source: { document: { kvdbs: ['kvdb-1', 'kvdb-2'] } } }] } };
      }
      return { hits: { hits: [], total: { value: 0 } } };
    });
    const response = buildResponseFactory();

    await service.searchKVDBs(
      {} as any,
      {
        body: { query: { match_all: {} }, integrationNames: ['aws'], space: 'standard' },
        query: {},
      } as any,
      response as any
    );

    const integrationsCall = callAsCurrentUser.mock.calls.find(
      (call) => call[1]?.index === 'wazuh-threatintel-integrations'
    );
    expect(integrationsCall).toBeDefined();
    expect(integrationsCall![1].body.query.bool.must).toEqual([
      { terms: { 'document.metadata.title': ['aws'] } },
      { term: { 'space.name': 'standard' } },
    ]);

    const kvdbsCall = callAsCurrentUser.mock.calls.find(
      (call) => call[1]?.index === 'wazuh-threatintel-kvdbs'
    );
    expect(kvdbsCall).toBeDefined();
    const kvdbsBody = JSON.parse(kvdbsCall![1].body);
    expect(kvdbsBody.query.bool.filter).toEqual([{ terms: { 'document.id': ['kvdb-1', 'kvdb-2'] } }]);
    expect(kvdbsBody.query.bool.must).toEqual([{ match_all: {} }]);
  });

  it('resolves multiple integrationNames (multiSelect or) in one terms clause', async () => {
    const { service, callAsCurrentUser } = buildService((params) => {
      if (params.index === 'wazuh-threatintel-integrations') {
        return { hits: { hits: [{ _source: { document: { kvdbs: ['kvdb-1'] } } }] } };
      }
      return { hits: { hits: [], total: { value: 0 } } };
    });
    const response = buildResponseFactory();

    await service.searchKVDBs(
      {} as any,
      { body: { query: { match_all: {} }, integrationNames: ['aws', 'cisco'] }, query: {} } as any,
      response as any
    );

    const integrationsCall = callAsCurrentUser.mock.calls.find(
      (call) => call[1]?.index === 'wazuh-threatintel-integrations'
    );
    expect(integrationsCall![1].body.query.bool.must).toEqual([
      { terms: { 'document.metadata.title': ['aws', 'cisco'] } },
    ]);
  });

  it('filters to zero results (document.id: []) when no integration matches, rather than falling back to unfiltered', async () => {
    const { service, callAsCurrentUser } = buildService((params) => {
      if (params.index === 'wazuh-threatintel-integrations') {
        return { hits: { hits: [] } };
      }
      return { hits: { hits: [], total: { value: 0 } } };
    });
    const response = buildResponseFactory();

    await service.searchKVDBs(
      {} as any,
      { body: { query: { match_all: {} }, integrationNames: ['unknown'] }, query: {} } as any,
      response as any
    );

    const kvdbsCall = callAsCurrentUser.mock.calls.find(
      (call) => call[1]?.index === 'wazuh-threatintel-kvdbs'
    );
    const kvdbsBody = JSON.parse(kvdbsCall![1].body);
    expect(kvdbsBody.query.bool.filter).toEqual([{ terms: { 'document.id': [] } }]);
  });

  it('does not resolve or filter by integration when integrationNames is omitted', async () => {
    const { service, callAsCurrentUser } = buildService(() => ({
      hits: { hits: [], total: { value: 0 } },
    }));
    const response = buildResponseFactory();

    await service.searchKVDBs(
      {} as any,
      { body: { query: { match_all: {} } }, query: {} } as any,
      response as any
    );

    const integrationsCall = callAsCurrentUser.mock.calls.find(
      (call) => call[1]?.index === 'wazuh-threatintel-integrations'
    );
    expect(integrationsCall).toBeUndefined();

    const kvdbsCall = callAsCurrentUser.mock.calls.find(
      (call) => call[1]?.index === 'wazuh-threatintel-kvdbs'
    );
    const kvdbsBody = JSON.parse(kvdbsCall![1].body);
    expect(kvdbsBody.query).toEqual({ match_all: {} });
  });
});
