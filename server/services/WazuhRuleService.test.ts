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

  const makeRequest = (body: any, query: any = { prePackaged: true }) => ({ query, body } as any);

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

  it('resolves integrationNames to rule ids via an exact terms match, space-scoped', async () => {
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
      makeRequest(
        { query: { match_all: {} }, integrationNames: ['aws'] },
        { prePackaged: true, space: 'standard' }
      ),
      response as any
    );

    const integrationSearchCall = callAsCurrentUser.mock.calls.find(
      (call) =>
        call[1]?.index === 'wazuh-threatintel-integrations' &&
        call[1]?.body?.query?.bool?.must?.some(
          (clause: any) => clause.terms?.['document.metadata.title']
        )
    );
    expect(integrationSearchCall).toBeDefined();
    expect(integrationSearchCall![1].body.query.bool.must).toEqual(
      expect.arrayContaining([
        { terms: { 'document.metadata.title': ['aws'] } },
        { term: { 'space.name': 'standard' } },
      ])
    );
  });

  it('injects the levels filter into bool.filter when levels is provided (Rules-only Severity filter)', async () => {
    const { osDriver, callAsCurrentUser } = buildClient(() => emptySearchHits);
    const service = new WazuhRulesService(osDriver);
    const response = buildResponseFactory();

    await service.getRules(
      {} as any,
      makeRequest({ query: { match_all: {} }, levels: ['critical', 'high'] }),
      response as any
    );

    const rulesSearchCall = callAsCurrentUser.mock.calls.find(
      (call) => call[1]?.body?.query?.bool?.filter
    );
    expect(rulesSearchCall![1].body.query.bool.filter).toEqual(
      expect.arrayContaining([{ terms: { 'document.level': ['critical', 'high'] } }])
    );
  });
});

describe('WazuhRulesService — rule resource', () => {
  const buildService = () => {
    const callAsCurrentUser = jest.fn(() => Promise.resolve({}));
    const osDriver: any = { asScoped: () => ({ callAsCurrentUser }) };
    return { service: new WazuhRulesService(osDriver), callAsCurrentUser };
  };

  const rule = {
    id: 'rule-id',
    sigma_id: '19aefed0-ffd4-47dc-a7fc-f8b1425e84f9',
    category: 'test-integration',
    log_source: { product: 'test-integration', category: 'application', service: 'python' },
    tags: [],
    false_positives: [],
    level: 'medium',
    status: 'stable',
    enabled: true,
    detection: 'condition: keywords\nkeywords:\n  - DataError\n',
    mitre: '',
    compliance: '',
    metadata: { title: 'Python SQL Exceptions', author: 'Thomas Patzke', description: '' },
  };

  it('sends sigma_id and every logsource field on create', async () => {
    const { service, callAsCurrentUser } = buildService();

    await service.createRule(
      {} as any,
      { body: { document: rule, integrationId: 'integration-id' } } as any,
      buildResponseFactory() as any
    );

    const { resource } = (callAsCurrentUser.mock.calls[0] as any)[1].body;
    expect(resource.sigma_id).toBe('19aefed0-ffd4-47dc-a7fc-f8b1425e84f9');
    expect(resource.logsource).toEqual({
      product: 'test-integration',
      category: 'application',
      service: 'python',
    });
  });

  it('sends sigma_id on update so editing a rule keeps it', async () => {
    const { service, callAsCurrentUser } = buildService();

    await service.updateRule(
      {} as any,
      { params: { ruleId: 'rule-id' }, body: { document: rule } } as any,
      buildResponseFactory() as any
    );

    const { resource } = (callAsCurrentUser.mock.calls[0] as any)[1].body;
    expect(resource.sigma_id).toBe('19aefed0-ffd4-47dc-a7fc-f8b1425e84f9');
  });

  it('fills a missing logsource.product from the category and omits an empty sigma_id', async () => {
    const { service, callAsCurrentUser } = buildService();

    await service.createRule(
      {} as any,
      {
        body: {
          document: { ...rule, sigma_id: undefined, log_source: { category: 'application' } },
          integrationId: 'integration-id',
        },
      } as any,
      buildResponseFactory() as any
    );

    const { resource } = (callAsCurrentUser.mock.calls[0] as any)[1].body;
    expect(resource).not.toHaveProperty('sigma_id');
    expect(resource.logsource).toEqual({ product: 'test-integration', category: 'application' });
  });
});
