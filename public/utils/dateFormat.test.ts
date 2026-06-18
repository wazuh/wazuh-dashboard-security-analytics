/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from '@jest/globals';
import { uiSettingsServiceMock } from '../../../../src/core/public/ui_settings/ui_settings_service.mock';
import { setUISettings } from '../services/utils/constants';
import { DEFAULT_EMPTY_DATA } from './constants';
import { formatUIDate } from './dateFormat';

/**
 * Override the global moment mock (test/setup.jest.ts) for this file so we can
 * assert which format/timezone `formatUIDate` actually applies. `.format()`
 * echoes its argument and `.tz()` is chainable, exposing the calls for assertions.
 */
jest.mock('moment', () => {
  const formatMock = jest.fn((format: string) => `formatted:${format}`);
  const tzMock = jest.fn(function (this: unknown) {
    return this;
  });
  const guessMock = jest.fn(() => 'America/Bogota');

  const moment: any = jest.fn((input?: unknown) => ({
    isValid: () => input !== 'invalid',
    tz: tzMock,
    format: formatMock,
  }));
  moment.tz = { guess: guessMock };
  moment.__mocks = { formatMock, tzMock, guessMock };

  return moment;
});

const { formatMock, tzMock, guessMock } = (jest.requireMock('moment') as any).__mocks;

const uiSettings = uiSettingsServiceMock.createStartContract();

const setSettings = (values: Record<string, unknown>) => {
  (uiSettings.get as jest.Mock).mockImplementation((key: string, defaultValue?: unknown) =>
    key in values ? values[key] : defaultValue
  );
};

describe('formatUIDate', () => {
  beforeAll(() => {
    setUISettings(uiSettings);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('formats a valid date using the configured dateFormat setting', () => {
    setSettings({ dateFormat: 'YYYY-MM-DD', 'dateFormat:tz': 'America/New_York' });

    expect(formatUIDate('2024-01-15T10:00:00Z')).toBe('formatted:YYYY-MM-DD');
    expect(formatMock).toHaveBeenCalledWith('YYYY-MM-DD');
  });

  it('applies the configured dateFormat:tz timezone', () => {
    setSettings({ dateFormat: 'YYYY-MM-DD', 'dateFormat:tz': 'America/New_York' });

    formatUIDate('2024-01-15T10:00:00Z');

    expect(tzMock).toHaveBeenCalledWith('America/New_York');
    expect(guessMock).not.toHaveBeenCalled();
  });

  it('falls back to the detected timezone when dateFormat:tz is "Browser"', () => {
    setSettings({ dateFormat: 'YYYY-MM-DD', 'dateFormat:tz': 'Browser' });

    formatUIDate('2024-01-15T10:00:00Z');

    expect(guessMock).toHaveBeenCalled();
    expect(tzMock).toHaveBeenCalledWith('America/Bogota');
  });

  it('returns DEFAULT_EMPTY_DATA for empty input', () => {
    setSettings({ dateFormat: 'YYYY-MM-DD' });

    expect(formatUIDate(undefined)).toBe(DEFAULT_EMPTY_DATA);
    expect(formatUIDate('')).toBe(DEFAULT_EMPTY_DATA);
    expect(formatUIDate(0)).toBe(DEFAULT_EMPTY_DATA);
    expect(formatMock).not.toHaveBeenCalled();
  });

  it('returns DEFAULT_EMPTY_DATA for an invalid date', () => {
    setSettings({ dateFormat: 'YYYY-MM-DD' });

    expect(formatUIDate('invalid')).toBe(DEFAULT_EMPTY_DATA);
  });

  it('falls back to the default format when uiSettings is unavailable', () => {
    jest.isolateModules(() => {
      // Fresh constants module → getUISettings() not set → getter throws and is
      // swallowed, so the util must not throw and uses the default format.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { formatUIDate: isolatedFormat } = require('./dateFormat');

      expect(() => isolatedFormat('2024-01-15T10:00:00Z')).not.toThrow();
      expect(isolatedFormat('2024-01-15T10:00:00Z')).toBe('formatted:MM/DD/YY h:mm a');
    });
  });
});
