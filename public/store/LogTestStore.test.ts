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
  it('shows the too-large guidance and passes the server message through when errorKind is payload-too-large', async () => {
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
    expect(result.error).toContain(
      'The log test event is too large to process. Reduce the event size and try again.'
    );
    expect(result.error).toContain(serverMessage);
    expect(addDanger).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining(serverMessage) })
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
});
