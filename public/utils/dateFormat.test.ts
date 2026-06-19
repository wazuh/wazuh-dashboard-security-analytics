/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import moment from 'moment';
import { uiSettingsServiceMock } from '../../../../src/core/public/ui_settings/ui_settings_service.mock';
import { setUISettings } from '../services/utils/constants';
import { DEFAULT_EMPTY_DATA } from './constants';
import { formatUIDate } from './dateFormat';

const momentInstance = (moment() as unknown) as {
  format: jest.Mock;
  tz: jest.Mock;
  isValid: jest.Mock;
};

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

    formatUIDate('2024-01-15T10:00:00Z');

    expect(momentInstance.format).toHaveBeenCalledWith('YYYY-MM-DD');
  });

  it('applies the configured dateFormat:tz timezone', () => {
    setSettings({ dateFormat: 'YYYY-MM-DD', 'dateFormat:tz': 'America/New_York' });

    formatUIDate('2024-01-15T10:00:00Z');

    expect(momentInstance.tz).toHaveBeenCalledWith('America/New_York');
  });

  it('falls back to the detected timezone when dateFormat:tz is "Browser"', () => {
    setSettings({ dateFormat: 'YYYY-MM-DD', 'dateFormat:tz': 'Browser' });

    formatUIDate('2024-01-15T10:00:00Z');

    // test/setup.jest.ts mocks moment.tz.guess() => 'Pacific/Tahiti'.
    expect(momentInstance.tz).toHaveBeenCalledWith('Pacific/Tahiti');
  });

  it('returns DEFAULT_EMPTY_DATA for empty input without formatting', () => {
    setSettings({ dateFormat: 'YYYY-MM-DD' });

    expect(formatUIDate(undefined)).toBe(DEFAULT_EMPTY_DATA);
    expect(formatUIDate('')).toBe(DEFAULT_EMPTY_DATA);
    expect(formatUIDate(0)).toBe(DEFAULT_EMPTY_DATA);
    expect(momentInstance.format).not.toHaveBeenCalled();
  });

  it('returns DEFAULT_EMPTY_DATA for an invalid date', () => {
    setSettings({ dateFormat: 'YYYY-MM-DD' });
    // The shared mock instance is always valid, so force an invalid result once.
    jest.spyOn(momentInstance, 'isValid').mockReturnValueOnce(false);

    expect(formatUIDate('not-a-date')).toBe(DEFAULT_EMPTY_DATA);
    expect(momentInstance.format).not.toHaveBeenCalled();
  });

  it('falls back to the default format when uiSettings is unavailable', () => {
    jest.isolateModules(() => {
      // Fresh module registry → constants' getUISettings() is unset and throws;
      // formatUIDate must swallow it and use the default format (DEFAULT_DATE_FORMAT).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { formatUIDate: isolatedFormat } = require('./dateFormat');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const isolatedMoment = require('moment');

      expect(() => isolatedFormat('2024-01-15T10:00:00Z')).not.toThrow();
      expect(isolatedMoment().format).toHaveBeenCalledWith('MM/DD/YY h:mm a');
    });
  });
});
