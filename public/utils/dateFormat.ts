/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import moment from 'moment';
import { getUISettings } from '../services/utils/constants';
import { DEFAULT_EMPTY_DATA } from './constants';

/** Fallback format when `dateFormat` is unavailable (matches the old `renderTime`). */
const DEFAULT_DATE_FORMAT = 'MM/DD/YY h:mm a';

/** Reads a uiSettings value; returns undefined if the client isn't set yet (e.g. unit tests). */
const getUiSetting = (key: string): string | undefined => {
  try {
    return getUISettings().get(key);
  } catch {
    return undefined;
  }
};

/** Timezone from `dateFormat:tz`; `Browser` or unset falls back to the detected zone. */
const getTimeZone = (): string => {
  const dateFormatTZ = getUiSetting('dateFormat:tz');
  return !dateFormatTZ || dateFormatTZ === 'Browser' ? moment.tz.guess() : dateFormatTZ;
};

/**
 * Formats a date honoring the `dateFormat` and `dateFormat:tz` advanced settings.
 * Returns `DEFAULT_EMPTY_DATA` for empty or invalid input.
 */
export const formatUIDate = (date?: number | string | Date): string => {
  const momentDate = moment(date);
  if (!date || !momentDate.isValid()) {
    return DEFAULT_EMPTY_DATA;
  }
  const dateFormat = getUiSetting('dateFormat') || DEFAULT_DATE_FORMAT;
  return momentDate.tz(getTimeZone()).format(dateFormat);
};
