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
        hits: [{ _index: 'x', _id: '1', _source: { detector_type: 'aws', source: 'Standard' } }],
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

describe('DetectorService.countDetectorsByIntegration', () => {
  const buildService = (searchDetectorsResult: any, shouldThrow = false) => {
    const callAsCurrentUser = jest.fn((method: string) => {
      if (method === CLIENT_DETECTOR_METHODS.SEARCH_DETECTORS) {
        if (shouldThrow) return Promise.reject(new Error('boom'));
        return Promise.resolve(searchDetectorsResult);
      }
      return Promise.resolve({});
    });
    const osDriver: any = { asScoped: () => ({ callAsCurrentUser }) };
    const service = new DetectorService(osDriver, false);
    return { service, callAsCurrentUser };
  };

  const makeRequest = (integration: string, space: string) =>
    ({ query: { integration, space }, body: {} } as any);

  it('builds the exact query body scoped to detector_type and lowercased space', async () => {
    const { service, callAsCurrentUser } = buildService({
      hits: { total: { value: 5 }, hits: [] },
    });
    const response = buildResponseFactory();

    await service.countDetectorsByIntegration(
      {} as any,
      makeRequest('aws', 'Standard'),
      response as any
    );

    const call = callAsCurrentUser.mock.calls.find(
      (c) => c[0] === CLIENT_DETECTOR_METHODS.SEARCH_DETECTORS
    );
    expect(call[1].body).toEqual({
      size: 0,
      track_total_hits: true,
      query: {
        nested: {
          path: 'detector',
          query: {
            bool: {
              filter: [
                { term: { 'detector.detector_type': 'aws' } },
                { term: { 'detector.source': 'standard' } },
              ],
            },
          },
        },
      },
    });
  });

  it('returns hits.total.value as count on success', async () => {
    const { service } = buildService({ hits: { total: { value: 5 }, hits: [] } });
    const response = buildResponseFactory();

    await service.countDetectorsByIntegration(
      {} as any,
      makeRequest('aws', 'standard'),
      response as any
    );

    const body = response.custom.mock.calls[0][0].body;
    expect(body.ok).toBe(true);
    expect(body.response.count).toBe(5);
  });

  it('returns ok:false with an extracted error message on throw', async () => {
    const { service } = buildService(undefined, true);
    const response = buildResponseFactory();

    await service.countDetectorsByIntegration(
      {} as any,
      makeRequest('aws', 'standard'),
      response as any
    );

    const body = response.custom.mock.calls[0][0].body;
    expect(body.ok).toBe(false);
    expect(body.error).toBeDefined();
  });
});
