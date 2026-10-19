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

const engineError = (statusCode: number, message: string) => {
  const error: any = new Error(message);
  error.statusCode = statusCode;
  error.body = { status: statusCode, message };
  return error;
};

describe('LogTestService.normalization', () => {
  it('calls the normalization endpoint and wraps its answer in the combined shape', async () => {
    const message = { output: { event: { kind: 'event' } }, asset_traces: [] };
    const callAsCurrentUser = jest.fn(() => Promise.resolve({ status: 200, message }));
    const service = new LogTestService(buildClient(callAsCurrentUser), false);

    const result: any = await service.normalization(
      {} as any,
      makeRequest(validDocument),
      buildResponseFactory() as any
    );

    expect(callAsCurrentUser).toHaveBeenCalledWith(
      'securityAnalytics.executeLogtestNormalization',
      { body: expect.objectContaining({ event: 'sample event', space: 'standard', metadata: {} }) }
    );
    expect(result.body).toEqual({
      ok: true,
      response: { status: 200, message: { normalization: message } },
    });
  });

  it('reports a 400 from the Engine inline, as the combined endpoint does', async () => {
    const upstream = "The 'test' environment does not exist.";
    const callAsCurrentUser = jest.fn(() => Promise.reject(engineError(400, upstream)));
    const service = new LogTestService(buildClient(callAsCurrentUser), false);

    const result: any = await service.normalization(
      {} as any,
      makeRequest(validDocument),
      buildResponseFactory() as any
    );

    expect(result.body.ok).toBe(true);
    expect(result.body.response.message.normalization).toEqual({
      status: 'error',
      error: { message: upstream, code: 'ENGINE_ERROR' },
    });
  });

  it('keeps payload-too-large as a failure', async () => {
    const callAsCurrentUser = jest.fn(() =>
      Promise.reject(engineError(413, 'Event exceeds the maximum allowed size of 1048576 bytes.'))
    );
    const service = new LogTestService(buildClient(callAsCurrentUser), false);

    const result: any = await service.normalization(
      {} as any,
      makeRequest(validDocument),
      buildResponseFactory() as any
    );

    expect(result.body).toEqual(
      expect.objectContaining({ ok: false, errorKind: 'payload-too-large' })
    );
  });
});

describe('LogTestService.detection', () => {
  const detectionDocument = {
    document: { space: 'test', integration: 'int-1', input: { 'process.name': 'sshd' } },
  };

  it('calls the detection endpoint and wraps its answer in the combined shape', async () => {
    const message = { status: 'success', rules_evaluated: 1, rules_matched: 1, matches: [] };
    const callAsCurrentUser = jest.fn(() => Promise.resolve({ status: 200, message }));
    const service = new LogTestService(buildClient(callAsCurrentUser), false);

    const result: any = await service.detection(
      {} as any,
      makeRequest(detectionDocument),
      buildResponseFactory() as any
    );

    expect(callAsCurrentUser).toHaveBeenCalledWith('securityAnalytics.executeLogtestDetection', {
      body: detectionDocument.document,
    });
    expect(result.body).toEqual({
      ok: true,
      response: { status: 200, message: { detection: message } },
    });
  });

  it('passes the content manager message through as a failure', async () => {
    const upstream = "Integration [int-1] not found in the 'test' space.";
    const callAsCurrentUser = jest.fn(() => Promise.reject(engineError(400, upstream)));
    const service = new LogTestService(buildClient(callAsCurrentUser), false);

    const result: any = await service.detection(
      {} as any,
      makeRequest(detectionDocument),
      buildResponseFactory() as any
    );

    expect(result.body).toEqual(expect.objectContaining({ ok: false, error: upstream }));
  });

  it('requires an integration before calling the content manager', async () => {
    const callAsCurrentUser = jest.fn();
    const service = new LogTestService(buildClient(callAsCurrentUser), false);

    const result: any = await service.detection(
      {} as any,
      makeRequest({ document: { space: 'test', integration: '', input: {} } }),
      buildResponseFactory() as any
    );

    expect(result.body).toEqual(
      expect.objectContaining({ ok: false, error: 'Integration is required.' })
    );
    expect(callAsCurrentUser).not.toHaveBeenCalled();
  });
});
