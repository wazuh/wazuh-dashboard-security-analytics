/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { LogTestStore } from './LogTestStore';

const buildService = (executeLogTest: jest.Mock) => ({ executeLogTest } as any);

const buildNotifications = () => {
  const addDanger = jest.fn();
  return { notifications: { toasts: { addDanger } } as any, addDanger };
};

const request = {} as any;

describe('LogTestStore.executeLogTest', () => {
  it('names the limit in human units when errorKind is payload-too-large', async () => {
    const serverMessage = 'Event exceeds the maximum allowed size of 1048576 bytes.';
    const service = buildService(
      jest.fn().mockResolvedValue({
        ok: false,
        error: serverMessage,
        errorKind: 'payload-too-large',
      })
    );
    const { notifications, addDanger } = buildNotifications();
    const store = new LogTestStore(service, notifications);

    const result = await store.executeLogTest(request);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      'The log test event is too large to process. Reduce it below 1 MB and try again. ' +
        'To accept larger events, increase plugins.content_manager.logtest.max_body_bytes.'
    );
    // The raw byte count never reaches the user.
    expect(result.error).not.toContain('1048576');
    expect(addDanger).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('1 MB') })
    );
  });

  it("keeps today's generic toast when errorKind is absent", async () => {
    const service = buildService(
      jest.fn().mockResolvedValue({ ok: false, error: 'Queue is required.' })
    );
    const { notifications, addDanger } = buildNotifications();
    const store = new LogTestStore(service, notifications);

    const result = await store.executeLogTest(request);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Queue is required.');
    expect(addDanger).toHaveBeenCalledWith(expect.objectContaining({ text: 'Queue is required.' }));
  });

  it("keeps today's generic toast when errorKind is a different, unmapped value", async () => {
    const service = buildService(
      jest.fn().mockResolvedValue({
        ok: false,
        error: 'Internal server error',
        errorKind: 'some-other-kind' as any,
      })
    );
    const { notifications, addDanger } = buildNotifications();
    const store = new LogTestStore(service, notifications);

    const result = await store.executeLogTest(request);

    expect(result.error).toBe('Internal server error');
    expect(addDanger).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Internal server error' })
    );
  });

  it('is unaffected on a successful response', async () => {
    const data = { output: 'ok' } as any;
    const service = buildService(jest.fn().mockResolvedValue({ ok: true, response: data }));
    const { notifications, addDanger } = buildNotifications();
    const store = new LogTestStore(service, notifications);

    const result = await store.executeLogTest(request);

    expect(result).toEqual({ success: true, data });
    expect(addDanger).not.toHaveBeenCalled();
  });

  it('adds the guidance when core.http rejects with a 413 from the dashboard itself', async () => {
    // What OSD's HttpFetchError carries when Hapi rejects an oversized body.
    const rejection = Object.assign(new Error('Request Entity Too Large'), {
      response: { status: 413 },
      body: {
        statusCode: 413,
        error: 'Request Entity Too Large',
        message: 'Payload content length greater than maximum allowed: 1048576',
      },
    });
    const service = buildService(jest.fn().mockRejectedValue(rejection));
    const { notifications, addDanger } = buildNotifications();
    const store = new LogTestStore(service, notifications);

    const result = await store.executeLogTest(request);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      'The log test event is too large to process. Reduce it below 1 MB and try again.'
    );
    // The limit comes from the rejecting layer, it is never hardcoded here.
    expect(result.error).not.toContain('1048576');
    // server.maxPayloadBytes governs every endpoint, so this path names no setting.
    expect(result.error).not.toContain('max_body_bytes');
    expect(addDanger).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('too large to process') })
    );
  });

  it('keeps the generic message when core.http rejects with any other status', async () => {
    const rejection = Object.assign(new Error('Bad Gateway'), {
      response: { status: 502 },
      body: { statusCode: 502, message: 'Bad Gateway' },
    });
    const service = buildService(jest.fn().mockRejectedValue(rejection));
    const { notifications, addDanger } = buildNotifications();
    const store = new LogTestStore(service, notifications);

    const result = await store.executeLogTest(request);

    expect(result.error).toBe('Bad Gateway');
    expect(result.error).not.toContain('too large to process');
    expect(addDanger).toHaveBeenCalled();
  });

  it('keeps the generic message when the rejection carries no status', async () => {
    const service = buildService(jest.fn().mockRejectedValue(new Error('network down')));
    const { notifications } = buildNotifications();
    const store = new LogTestStore(service, notifications);

    const result = await store.executeLogTest(request);

    expect(result.error).toBe('network down');
    expect(result.error).not.toContain('too large to process');
  });

  it('scales the unit to the size the rejecting layer reports', async () => {
    const service = buildService(
      jest.fn().mockResolvedValue({
        ok: false,
        error: 'Payload content length greater than maximum allowed: 5242880',
        errorKind: 'payload-too-large',
      })
    );
    const { notifications } = buildNotifications();
    const store = new LogTestStore(service, notifications);

    const result = await store.executeLogTest(request);

    expect(result.error).toContain('below 5 MB');
    expect(result.error).toContain('increase plugins.content_manager.logtest.max_body_bytes');
  });

  it('keeps the raw message when it carries no byte count', async () => {
    const upstream = 'Request entity too large.';
    const service = buildService(
      jest.fn().mockResolvedValue({ ok: false, error: upstream, errorKind: 'payload-too-large' })
    );
    const { notifications } = buildNotifications();
    const store = new LogTestStore(service, notifications);

    const result = await store.executeLogTest(request);

    expect(result.error).toContain('too large to process');
    expect(result.error).toContain(upstream);
  });
});
