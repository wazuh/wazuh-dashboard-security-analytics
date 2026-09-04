/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { LogTestService } from './LogTestService';

const buildResponseFactory = () => ({
  custom: jest.fn((opts: any) => opts),
});

const buildClient = (callAsCurrentUser: jest.Mock) => {
  const osDriver: any = { asScoped: () => ({ callAsCurrentUser }) };
  return osDriver;
};

const makeRequest = (body: any, query: any = {}) => ({ query, body } as any);

const validDocument = {
  document: {
    queue: '1',
    event: 'sample event',
    space: 'standard',
    location: 'test',
  },
};

describe('LogTestService.logTest', () => {
  it('sets errorKind to payload-too-large when the upstream client throws a 413', async () => {
    const upstreamMessage = 'Event exceeds the maximum allowed size of 1048576 bytes.';
    const callAsCurrentUser = jest.fn(() => {
      const error: any = new Error(upstreamMessage);
      error.statusCode = 413;
      error.body = { status: 413, message: upstreamMessage };
      return Promise.reject(error);
    });
    const service = new LogTestService(buildClient(callAsCurrentUser), false);
    const response = buildResponseFactory();

    const result: any = await service.logTest(
      {} as any,
      makeRequest(validDocument),
      response as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({
      ok: false,
      error: upstreamMessage,
      errorKind: 'payload-too-large',
    });
  });

  it('leaves errorKind undefined for a non-mapped upstream error', async () => {
    const callAsCurrentUser = jest.fn(() => {
      const error: any = new Error('Internal server error');
      error.statusCode = 500;
      return Promise.reject(error);
    });
    const service = new LogTestService(buildClient(callAsCurrentUser), false);
    const response = buildResponseFactory();

    const result: any = await service.logTest(
      {} as any,
      makeRequest(validDocument),
      response as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body.ok).toBe(false);
    expect(result.body.errorKind).toBeUndefined();
    expect(result.body.error).toBe('Internal server error');
  });

  it('does not set errorKind on a successful log test', async () => {
    const logTestResponse = { output: 'ok' };
    const callAsCurrentUser = jest.fn(() => Promise.resolve(logTestResponse));
    const service = new LogTestService(buildClient(callAsCurrentUser), false);
    const response = buildResponseFactory();

    const result: any = await service.logTest(
      {} as any,
      makeRequest(validDocument),
      response as any
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ ok: true, response: logTestResponse });
    expect(result.body.errorKind).toBeUndefined();
  });
});
