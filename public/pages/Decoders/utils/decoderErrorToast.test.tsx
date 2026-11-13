/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { decoderWriteErrorToast } from './decoderErrorToast';

// No jest.mock of utils/helpers here: test/setup.jest.ts loads DataStore, and with it this
// module, before a mock could apply. The fallback is checked through the toast it produces.

const EXPRESSION = '<a> \\ <b>';
const ENGINE_MESSAGE = [
  'Engine validation failed. An error occurred while parsing a log: ',
  'Main error: Expected end of input at 4',
  EXPRESSION,
  '----^',
  '',
  'List of errors:',
].join('\n');

const notificationsMock = () => ({ toasts: { addDanger: jest.fn() } } as any);

describe('decoderWriteErrorToast', () => {
  beforeEach(() => {
    // The fallback toast logs the error it shows.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the parser failure as a short message with the trace behind a toggle', () => {
    const notifications = notificationsMock();

    decoderWriteErrorToast(notifications, 'create', ENGINE_MESSAGE, {
      'parse|event.original': [EXPRESSION],
    });

    expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    const toast = notifications.toasts.addDanger.mock.calls[0][0];
    expect(toast.title).toBe('Failed to create decoder:');
    // A mount point, not the raw engine string.
    expect(typeof toast.text).toBe('function');

    const element = document.createElement('div');
    const unmount = toast.text(element);
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        expect(element.textContent).toContain(
          'Parsers > event.original, expression 1: expected end of input at position 4'
        );
        expect(element.textContent).toContain('Show details');
        expect(element.textContent).not.toContain('List of errors:');
        unmount();
        resolve();
      })
    );
  });

  it('names the update action', () => {
    const notifications = notificationsMock();

    decoderWriteErrorToast(notifications, 'update', ENGINE_MESSAGE, {});

    expect(notifications.toasts.addDanger.mock.calls[0][0].title).toBe('Failed to update decoder:');
  });

  it('keeps the usual toast for any other error', () => {
    const notifications = notificationsMock();

    decoderWriteErrorToast(notifications, 'create', 'Integration [abc] not found.', {});

    expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: 'Failed to create decoder:',
      text: 'Integration [abc] not found.',
      toastLifeTimeMs: 5000,
    });
  });
});
