/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { DecodersService } from './DecodersService';

const buildResponseFactory = () => ({
  custom: jest.fn((opts: any) => opts),
});

describe('DecodersService.searchDecoders — status/integration filters', () => {
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

  const makeRequest = (body: any, query: any = {}) => ({ query, body } as any);

  it('injects the status filter into bool.filter when status is provided', async () => {
    const { osDriver, callAsCurrentUser } = buildClient(() => emptySearchHits);
    const service = new DecodersService(osDriver);
    const response = buildResponseFactory();

    await service.searchDecoders(
      {} as any,
      makeRequest({ status: 'disabled' }, { space: 'standard' }),
      response as any
    );

    const decodersSearchCall = callAsCurrentUser.mock.calls.find(
      (call) => call[0] === 'search' && call[1]?.index === 'wazuh-threatintel-decoders'
    );
    expect(decodersSearchCall).toBeDefined();
    const filterClause = decodersSearchCall![1].body.query.bool.filter;
    expect(filterClause).toEqual(expect.arrayContaining([{ term: { 'document.enabled': false } }]));
  });

  it('resolves integrationNames to decoder ids via an exact terms match, space-scoped', async () => {
    const { osDriver, callAsCurrentUser } = buildClient((params) => {
      if (params.index === 'wazuh-threatintel-integrations') {
        return {
          hits: { hits: [{ _source: { document: { decoders: ['decoder-1'] } } }] },
        };
      }
      return emptySearchHits;
    });
    const service = new DecodersService(osDriver);
    const response = buildResponseFactory();

    await service.searchDecoders(
      {} as any,
      makeRequest({ integrationNames: ['aws'] }, { space: 'standard' }),
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

  it('resolves multiple integrationNames (multiSelect or) in one terms clause', async () => {
    const { osDriver, callAsCurrentUser } = buildClient((params) => {
      if (params.index === 'wazuh-threatintel-integrations') {
        return {
          hits: { hits: [{ _source: { document: { decoders: ['decoder-1'] } } }] },
        };
      }
      return emptySearchHits;
    });
    const service = new DecodersService(osDriver);
    const response = buildResponseFactory();

    await service.searchDecoders(
      {} as any,
      makeRequest({ integrationNames: ['aws', 'cisco'] }, { space: 'standard' }),
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
      expect.arrayContaining([{ terms: { 'document.metadata.title': ['aws', 'cisco'] } }])
    );
  });

  it('does not alter the query shape when no status/integration filter is selected', async () => {
    const { osDriver, callAsCurrentUser } = buildClient(() => emptySearchHits);
    const service = new DecodersService(osDriver);
    const response = buildResponseFactory();

    await service.searchDecoders({} as any, makeRequest({}, {}), response as any);

    const decodersSearchCall = callAsCurrentUser.mock.calls.find(
      (call) => call[0] === 'search' && call[1]?.index === 'wazuh-threatintel-decoders'
    );
    expect(decodersSearchCall![1].body.query).toEqual({ match_all: {} });
  });
});
