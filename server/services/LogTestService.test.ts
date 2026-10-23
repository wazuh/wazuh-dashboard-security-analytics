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

describe('LogTestService.logTest with a normalization space', () => {
  const output = { process: { name: 'sshd' } };
  const detection = { status: 'success', rules_evaluated: 1, rules_matched: 1, matches: [] };

  const buildSplitClient = () =>
    jest.fn((method: string) =>
      Promise.resolve(
        method.endsWith('Normalization')
          ? { status: 200, message: { output, asset_traces: [] } }
          : { status: 200, message: detection }
      )
    );

  const splitDocument = (overrides: object = {}) => ({
    document: {
      ...validDocument.document,
      space: 'test',
      integration: 'integration-id',
      normalization_space: 'standard',
      ...overrides,
    },
  });

  it('normalizes in the normalization space and runs the rules of the tested space on its output', async () => {
    const callAsCurrentUser = buildSplitClient();
    const service = new LogTestService(buildClient(callAsCurrentUser), false);

    const result: any = await service.logTest(
      {} as any,
      makeRequest(splitDocument()),
      buildResponseFactory() as any
    );

    expect(callAsCurrentUser).toHaveBeenCalledTimes(2);
    const [normalizationCall, detectionCall] = callAsCurrentUser.mock.calls as any[];
    expect(normalizationCall[1].body).toEqual(
      expect.objectContaining({ space: 'standard', event: 'sample event' })
    );
    expect(normalizationCall[1].body).not.toHaveProperty('integration');
    expect(normalizationCall[1].body).not.toHaveProperty('normalization_space');
    expect(detectionCall[1].body).toEqual({
      space: 'test',
      integration: 'integration-id',
      input: output,
    });
    expect(result.body).toEqual({
      ok: true,
      response: {
        status: '200',
        message: {
          normalization: { status: 'success', output, asset_traces: [] },
          detection,
        },
      },
    });
  });

  it('skips detection when no integration is selected', async () => {
    const callAsCurrentUser = buildSplitClient();
    const service = new LogTestService(buildClient(callAsCurrentUser), false);

    const result: any = await service.logTest(
      {} as any,
      makeRequest(splitDocument({ integration: undefined })),
      buildResponseFactory() as any
    );

    expect(callAsCurrentUser).toHaveBeenCalledTimes(1);
    expect(result.body.response.message.detection).toEqual({
      status: 'skipped',
      reason: 'No integration selected.',
    });
  });

  it('uses the combined endpoint when the normalization space is the tested space', async () => {
    const callAsCurrentUser = jest.fn(() => Promise.resolve({ status: 200, message: {} }));
    const service = new LogTestService(buildClient(callAsCurrentUser), false);

    await service.logTest(
      {} as any,
      makeRequest(splitDocument({ normalization_space: 'test' })),
      buildResponseFactory() as any
    );

    expect(callAsCurrentUser).toHaveBeenCalledTimes(1);
    const [method, params] = (callAsCurrentUser.mock.calls as any[])[0];
    expect(method).toMatch(/executeLogtest$/);
    expect(params.body).not.toHaveProperty('normalization_space');
  });
});
