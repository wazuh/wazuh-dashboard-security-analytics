/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import DetectorService from './DetectorService';
import { CLIENT_DETECTOR_METHODS } from '../utils/constants';

const buildResponseFactory = () => ({
  custom: jest.fn((opts: any) => opts),
});

describe('DetectorService.searchDetectors — integration id resolution', () => {
  const buildService = (searchDetectorsResult: any, integrationsSearchResult: any) => {
    const callAsCurrentUser = jest.fn((method: string) => {
      if (method === CLIENT_DETECTOR_METHODS.SEARCH_DETECTORS) {
        return Promise.resolve(searchDetectorsResult);
      }
      if (method === 'search') {
        return Promise.resolve(integrationsSearchResult);
      }
      return Promise.resolve({});
    });
    const osDriver: any = { asScoped: () => ({ callAsCurrentUser }) };
    const service = new DetectorService(osDriver, false);
    return { service, callAsCurrentUser };
  };

  const makeRequest = (body: any = {}) => ({ query: {}, body } as any);

  it('attaches the resolved integrationId to each detector hit', async () => {
    const searchDetectorsResult = {
      hits: {
        hits: [
          { _index: 'x', _id: '1', _source: { detector_type: 'aws', source: 'Standard' } },
        ],
      },
    };
    const integrationsSearchResult = {
      hits: {
        hits: [
          {
            _source: {
              document: { id: 'int-1', metadata: { title: 'aws' } },
              space: { name: 'standard' },
            },
          },
        ],
      },
    };
    const { service } = buildService(searchDetectorsResult, integrationsSearchResult);
    const response = buildResponseFactory();

    await service.searchDetectors({} as any, makeRequest(), response as any);

    const body = response.custom.mock.calls[0][0].body;
    expect(body.response.hits.hits[0].integrationId).toBe('int-1');
  });

  it('leaves integrationId undefined when no integration matches the title/space', async () => {
    const searchDetectorsResult = {
      hits: {
        hits: [{ _index: 'x', _id: '1', _source: { detector_type: 'unknown', source: 'custom' } }],
      },
    };
    const { service } = buildService(searchDetectorsResult, { hits: { hits: [] } });
    const response = buildResponseFactory();

    await service.searchDetectors({} as any, makeRequest(), response as any);

    const body = response.custom.mock.calls[0][0].body;
    expect(body.response.hits.hits[0].integrationId).toBeUndefined();
  });

  it('does not query the integrations index when there are no detector hits', async () => {
    const { service, callAsCurrentUser } = buildService(
      { hits: { hits: [] } },
      { hits: { hits: [] } }
    );
    const response = buildResponseFactory();

    await service.searchDetectors({} as any, makeRequest(), response as any);

    const integrationsCall = callAsCurrentUser.mock.calls.find((call) => call[0] === 'search');
    expect(integrationsCall).toBeUndefined();
  });
});
