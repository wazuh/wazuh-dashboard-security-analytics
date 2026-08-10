/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import WazuhRulesService from './WazuhRuleService';

const buildResponseFactory = () => ({
  custom: jest.fn((opts: any) => opts),
});

describe('WazuhRulesService.getRules — status/integration filters', () => {
  const buildClient = (searchImpl: (params: any) => any) => {
    const callAsCurrentUser = jest.fn((method: string, params: any) => {
      if (method === 'search') {
        return Promise.resolve(searchImpl(params));
      }
      return Promise.resolve({});
    });
    const osDriver: any = { asScoped: () => ({ callAsCurrentUser }) };
    return { osDriver, callAsCurrentUser };
  };

  const emptySearchHits = { hits: { hits: [] } };

  const makeRequest = (body: any, query: any = { prePackaged: true }) =>
    ({ query, body } as any);

  it('emits a byte-identical query shape when no status/integration filter is selected', async () => {
    const { osDriver, callAsCurrentUser } = buildClient(() => emptySearchHits);
    const service = new WazuhRulesService(osDriver);
    const response = buildResponseFactory();

    await service.getRules({} as any, makeRequest({ query: { match_all: {} } }), response as any);

    const rulesSearchCall = callAsCurrentUser.mock.calls.find(
      (call) => call[1]?.index === 'wazuh-threatintel-rules' || call[0] === 'search'
    );
    expect(rulesSearchCall).toBeDefined();
  });

  it('injects the status filter into bool.filter when status is provided', async () => {
    const { osDriver, callAsCurrentUser } = buildClient(() => emptySearchHits);
    const service = new WazuhRulesService(osDriver);
    const response = buildResponseFactory();

    await service.getRules(
      {} as any,
      makeRequest({ query: { match_all: {} }, status: 'disabled' }),
      response as any
    );

    const rulesSearchCall = callAsCurrentUser.mock.calls.find(
      (call) => call[1]?.body?.query?.bool?.filter
    );
    expect(rulesSearchCall![1].body.query.bool.filter).toEqual(
      expect.arrayContaining([{ term: { 'document.enabled': false } }])
    );
  });

  it('resolves integrationName to rule ids via an exact term match, space-scoped', async () => {
    const { osDriver, callAsCurrentUser } = buildClient((params) => {
      if (params.index === 'wazuh-threatintel-integrations') {
        return {
          hits: {
            hits: [{ _source: { document: { rules: ['rule-1', 'rule-2'] } } }],
          },
        };
      }
      return emptySearchHits;
    });
    const service = new WazuhRulesService(osDriver);
    const response = buildResponseFactory();

    await service.getRules(
      {} as any,
      makeRequest({ query: { match_all: {} }, integrationName: 'aws' }, { prePackaged: true, space: 'standard' }),
      response as any
    );

    const integrationSearchCall = callAsCurrentUser.mock.calls.find(
      (call) =>
        call[1]?.index === 'wazuh-threatintel-integrations' &&
        call[1]?.body?.query?.bool?.must?.some((clause: any) => clause.term?.['document.metadata.title'])
    );
    expect(integrationSearchCall).toBeDefined();
    expect(integrationSearchCall![1].body.query.bool.must).toEqual(
      expect.arrayContaining([
        { term: { 'document.metadata.title': 'aws' } },
        { term: { 'space.name': 'standard' } },
      ])
    );
  });
});
